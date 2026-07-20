import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { BongmeisterService } from './bongmeister.service';
import { approveStatus } from './generated/prisma/client';
import { PrismaService } from './prisma.service';
import { BongAction } from './dto/moderate-bong.dto';
import { of, throwError } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

describe('BongmeisterService', () => {
  let service: BongmeisterService;
  let prisma: DeepMockProxy<PrismaService>;
  const memberGrpcService = {
    resolveCurrentMember: jest.fn(),
  };
  const grpcClient = {
    getService: jest.fn(() => memberGrpcService),
  };

  const pendingBong = {
    id: 'bong-1',
    fromId: 'member-1',
    toId: 'member-2',
    acceptedId: null,
    amount: 2,
    reason: 'Kom sent',
    status: approveStatus.PENDING,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BongmeisterService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MEMBER_PACKAGE', useValue: grpcClient },
      ],
    }).compile();

    service = module.get(BongmeisterService);
    service.onModuleInit();
    prisma.add.findUnique.mockResolvedValue(pendingBong);
    memberGrpcService.resolveCurrentMember.mockReturnValue(
      of({ id: 'reviewer-member-id' }),
    );
  });

  it('approves a pending bong', async () => {
    prisma.add.update.mockResolvedValue({
      ...pendingBong,
      status: approveStatus.APPROVED,
    });

    await service.moderate(
      pendingBong.id,
      { action: BongAction.APPROVE },
      'Bearer token',
    );

    expect(prisma.add.update).toHaveBeenCalledWith({
      where: { id: pendingBong.id },
      data: {
        status: approveStatus.APPROVED,
        acceptedId: 'reviewer-member-id',
      },
    });
    expect(memberGrpcService.resolveCurrentMember).toHaveBeenCalledWith(
      {},
      expect.any(Metadata),
    );
    const metadata = memberGrpcService.resolveCurrentMember.mock
      .calls[0][1] as Metadata;
    expect(metadata.get('authorization')).toEqual(['Bearer token']);
  });

  it('edits and approves a pending bong', async () => {
    prisma.add.update.mockResolvedValue({
      ...pendingBong,
      amount: 4,
      status: approveStatus.APPROVED,
    });

    await service.moderate(
      pendingBong.id,
      {
        action: BongAction.APPROVE,
        amount: 4,
      },
      'Bearer token',
    );

    expect(prisma.add.update).toHaveBeenCalledWith({
      where: { id: pendingBong.id },
      data: {
        amount: 4,
        status: approveStatus.APPROVED,
        acceptedId: 'reviewer-member-id',
      },
    });
  });

  it('rejects a pending bong', async () => {
    prisma.add.update.mockResolvedValue({
      ...pendingBong,
      status: approveStatus.DENIED,
    });

    await service.moderate(
      pendingBong.id,
      { action: BongAction.REJECT },
      'Bearer token',
    );

    expect(prisma.add.update).toHaveBeenCalledWith({
      where: { id: pendingBong.id },
      data: {
        status: approveStatus.DENIED,
        acceptedId: 'reviewer-member-id',
      },
    });
  });

  it('rejects an unknown bong ID', async () => {
    prisma.add.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.moderate(
        'missing-id',
        { action: BongAction.APPROVE },
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.add.update).not.toHaveBeenCalled();
  });

  it('does not moderate an already handled bong', async () => {
    prisma.add.findUnique.mockResolvedValueOnce({
      ...pendingBong,
      status: approveStatus.APPROVED,
    });

    await expect(
      service.moderate(
        pendingBong.id,
        { action: BongAction.REJECT },
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.add.update).not.toHaveBeenCalled();
  });

  it('does not update when member-api cannot resolve the reviewer', async () => {
    const grpcError = { code: 7, details: 'Member account is not linked' };
    memberGrpcService.resolveCurrentMember.mockReturnValueOnce(
      throwError(() => grpcError),
    );

    await expect(
      service.moderate(
        pendingBong.id,
        { action: BongAction.APPROVE },
        'Bearer token',
      ),
    ).rejects.toBe(grpcError);
    expect(prisma.add.update).not.toHaveBeenCalled();
  });
});
