import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

    // Make $transaction actually run the callback against the same mocked
    // client, so `base.x.y(...)` calls inside the transaction hit our
    // existing prisma mocks instead of a disconnected deep mock.
    prisma.$transaction.mockImplementation((callback: any) =>
      typeof callback === 'function'
        ? callback(prisma)
        : Promise.resolve(callback),
    );
  });

  describe('moderate', () => {
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
          amount: pendingBong.amount,
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
          amount: pendingBong.amount,
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

    describe('balance updates', () => {
      it('creates a bongBalance row on first approval for a member', async () => {
        prisma.add.update.mockResolvedValue({
          ...pendingBong,
          status: approveStatus.APPROVED,
        });

        await service.moderate(
          pendingBong.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        );

        expect(prisma.bongBalance.upsert).toHaveBeenCalledWith({
          where: { memberId: pendingBong.toId },
          create: {
            memberId: pendingBong.toId,
            totalAdded: pendingBong.amount,
          },
          update: { totalAdded: { increment: pendingBong.amount } },
        });
      });

      it('uses the edited amount (not the original) when upserting balance', async () => {
        prisma.add.update.mockResolvedValue({
          ...pendingBong,
          amount: 10,
          status: approveStatus.APPROVED,
        });

        await service.moderate(
          pendingBong.id,
          { action: BongAction.APPROVE, amount: 10 },
          'Bearer token',
        );

        expect(prisma.bongBalance.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: { memberId: pendingBong.toId, totalAdded: 10 },
            update: { totalAdded: { increment: 10 } },
          }),
        );
      });

      it('does not touch bongBalance when rejecting', async () => {
        prisma.add.update.mockResolvedValue({
          ...pendingBong,
          status: approveStatus.DENIED,
        });

        await service.moderate(
          pendingBong.id,
          { action: BongAction.REJECT },
          'Bearer token',
        );

        expect(prisma.bongBalance.upsert).not.toHaveBeenCalled();
      });
    });
  });

  describe('moderateRedeem', () => {
    const pendingRedemption = {
      id: 'redemption-1',
      toId: 'member-2',
      fromId: 'member-1',
      amount: 5,
      status: approveStatus.PENDING,
      acceptedId: null,
      reviewedAt: null,
    };

    const balance = {
      memberId: 'member-2',
      totalAdded: 20,
      totalTaken: 0,
      totalPending: 5,
    };

    beforeEach(() => {
      prisma.redemption.findUnique.mockResolvedValue(pendingRedemption);
      prisma.bongBalance.findUnique.mockResolvedValue(balance);
      prisma.redemption.updateMany.mockResolvedValue({ count: 1 });
      prisma.redemption.findUniqueOrThrow.mockResolvedValue({
        ...pendingRedemption,
        status: approveStatus.APPROVED,
      });
    });

    it('approves a redemption and moves pending to taken', async () => {
      await service.moderateRedeem(
        pendingRedemption.id,
        { action: BongAction.APPROVE },
        'Bearer token',
      );

      expect(prisma.redemption.updateMany).toHaveBeenCalledWith({
        where: { id: pendingRedemption.id, status: approveStatus.PENDING },
        data: {
          status: approveStatus.APPROVED,
          acceptedId: 'reviewer-member-id',
          amount: pendingRedemption.amount,
          reviewedAt: expect.any(Date),
        },
      });

      expect(prisma.bongBalance.update).toHaveBeenCalledWith({
        where: { memberId: pendingRedemption.toId },
        data: {
          totalPending: { decrement: pendingRedemption.amount },
          totalTaken: { increment: pendingRedemption.amount },
        },
      });
    });

    it('rejects a redemption and only releases the pending hold', async () => {
      await service.moderateRedeem(
        pendingRedemption.id,
        { action: BongAction.REJECT },
        'Bearer token',
      );

      expect(prisma.bongBalance.update).toHaveBeenCalledWith({
        where: { memberId: pendingRedemption.toId },
        data: {
          totalPending: { decrement: pendingRedemption.amount },
        },
      });
    });

    it('throws NotFoundException when the redemption does not exist', async () => {
      prisma.redemption.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.moderateRedeem(
          'missing-id',
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.redemption.updateMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the redemption is already handled (pre-transaction check)', async () => {
      prisma.redemption.findUnique.mockResolvedValueOnce({
        ...pendingRedemption,
        status: approveStatus.APPROVED,
      });

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.redemption.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if the redemption disappears inside the transaction', async () => {
      // First lookup (outside tx) succeeds, second lookup (inside tx)
      // returns null, simulating a concurrent delete.
      prisma.redemption.findUnique
        .mockResolvedValueOnce(pendingRedemption)
        .mockResolvedValueOnce(null);

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException if the status changes between the two reads inside the transaction', async () => {
      prisma.redemption.findUnique
        .mockResolvedValueOnce(pendingRedemption)
        .mockResolvedValueOnce({
          ...pendingRedemption,
          status: approveStatus.DENIED,
        });

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when no bongBalance row exists for the member', async () => {
      prisma.bongBalance.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.redemption.updateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when increasing the amount exceeds available balance', async () => {
      // available = 20 - 0 - 5 = 15; bumping amount to 25 needs +20 more
      // than is available.
      prisma.bongBalance.findUnique.mockResolvedValueOnce(balance);

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE, amount: 25 },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.redemption.updateMany).not.toHaveBeenCalled();
    });

    it('allows decreasing the amount even if available balance is tight', async () => {
      prisma.bongBalance.findUnique.mockResolvedValueOnce({
        ...balance,
        totalAdded: 5,
        totalPending: 5,
      }); // available = 0

      await service.moderateRedeem(
        pendingRedemption.id,
        { action: BongAction.APPROVE, amount: 2 }, // additionalAmount = -3
        'Bearer token',
      );

      expect(prisma.redemption.updateMany).toHaveBeenCalled();
    });

    it('does not run the balance-sufficiency check when rejecting, regardless of amount', async () => {
      prisma.bongBalance.findUnique.mockResolvedValueOnce({
        ...balance,
        totalAdded: 0,
        totalTaken: 0,
        totalPending: 5,
      }); // available = -5

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.REJECT, amount: 100 },
          'Bearer token',
        ),
      ).resolves.toBeDefined();
    });

    it('throws BadRequestException on a concurrent-moderation race (updateMany count 0)', async () => {
      prisma.redemption.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.bongBalance.update).not.toHaveBeenCalled();
    });

    it('runs in a Serializable transaction', async () => {
      await service.moderateRedeem(
        pendingRedemption.id,
        { action: BongAction.APPROVE },
        'Bearer token',
      );

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('forwards the JWT when resolving the reviewer', async () => {
      const authorization = 'Bearer signed-token';
      await service.moderateRedeem(
        pendingRedemption.id,
        { action: BongAction.APPROVE },
        authorization,
      );

      const metadata = memberGrpcService.resolveCurrentMember.mock
        .calls[0][1] as Metadata;
      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it('propagates a gRPC failure without writing anything', async () => {
      const grpcError = { code: 7, details: 'Not linked' };
      memberGrpcService.resolveCurrentMember.mockReturnValueOnce(
        throwError(() => grpcError),
      );

      await expect(
        service.moderateRedeem(
          pendingRedemption.id,
          { action: BongAction.APPROVE },
          'Bearer token',
        ),
      ).rejects.toBe(grpcError);
      expect(prisma.redemption.updateMany).not.toHaveBeenCalled();
    });
  });
});