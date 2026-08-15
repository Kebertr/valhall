import { HttpException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Metadata } from '@grpc/grpc-js';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';
import { BongService } from './bong.service';
import { PrismaService } from './prisma.service';
import { approveStatus } from './generated/prisma/client';

describe('BongService', () => {
  let service: BongService;
  let prisma: DeepMockProxy<PrismaService>;

  const memberGrpcService = {
    resolveShotParticipants: jest.fn(),
    resolveMemberNames: jest.fn(),
  };

  const grpcClient = {
    getService: jest.fn(() => memberGrpcService),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BongService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: 'MEMBER_PACKAGE',
          useValue: grpcClient,
        },
      ],
    }).compile();

    service = module.get(BongService);

    service.onModuleInit();
  });

  describe('addShot', () => {
    it('adds a shot using participants returned by member-api', async () => {
      const body = {
        Id: 'target-member-uuid',
        amount: 5,
        reason: 'Testing',
      };

      const authorization = 'Bearer signed-token';

      memberGrpcService.resolveShotParticipants.mockReturnValueOnce(
        of({
          fromId: 'sender-member-uuid',
          toId: 'target-member-uuid',
        }),
      );

      prisma.add.create.mockResolvedValueOnce({
        id: 'shot-1',
        fromId: 'sender-member-uuid',
        toId: 'target-member-uuid',
        acceptedId: null,
        amount: 5,
        reason: 'Testing',
        status: approveStatus.PENDING,
        createdAt: new Date(),
      });

      const result = await service.addShot(body, authorization);

      expect(memberGrpcService.resolveShotParticipants).toHaveBeenCalledWith(
        {
          targetMemberRecordId: 'target-member-uuid',
        },
        expect.any(Metadata),
      );

      expect(prisma.add.create).toHaveBeenCalledWith({
        data: {
          fromId: 'sender-member-uuid',
          toId: 'target-member-uuid',
          amount: 5,
          reason: 'Testing',
        },
      });

      expect(result).toMatchObject({
        ok: true,
        message: 'Added target-member-uuid',
        received: {
          Id: 'target-member-uuid',
          amount: 5,
          reason: 'Testing',
          status: 'pending',
        },
      });
    });

    it('forwards the JWT through gRPC metadata', async () => {
      const authorization = 'Bearer signed-token';

      memberGrpcService.resolveShotParticipants.mockReturnValueOnce(
        of({
          fromId: 'sender-member-uuid',
          toId: 'target-member-uuid',
        }),
      );

      prisma.add.create.mockResolvedValueOnce({
        id: 'shot-1',
        fromId: 'sender-member-uuid',
        toId: 'target-member-uuid',
        acceptedId: null,
        amount: 1,
        reason: 'Testing metadata',
        status: approveStatus.PENDING,
        createdAt: new Date(),
      });

      await service.addShot(
        {
          Id: 'target-member-uuid',
          amount: 1,
          reason: 'Testing metadata',
        },
        authorization,
      );

      const grpcCall = memberGrpcService.resolveShotParticipants.mock.calls[0];

      const metadata = grpcCall[1] as Metadata;

      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it.each([
      {
        grpcCode: 3,
        details: 'Only GUD members can receive shots',
        expectedHttpStatus: 400,
      },
      {
        grpcCode: 5,
        details: 'Member not found',
        expectedHttpStatus: 404,
      },
      {
        grpcCode: 7,
        details: 'Connect your member account first',
        expectedHttpStatus: 403,
      },
      {
        grpcCode: 16,
        details: 'Unauthenticated',
        expectedHttpStatus: 401,
      },
      {
        grpcCode: 13,
        details: 'Unexpected member service failure',
        expectedHttpStatus: 500,
      },
    ])(
      'maps gRPC code $grpcCode to HTTP $expectedHttpStatus without writing to the database',
      async ({ grpcCode, details, expectedHttpStatus }) => {
        memberGrpcService.resolveShotParticipants.mockReturnValueOnce(
          throwError(() => ({
            code: grpcCode,
            details,
          })),
        );

        let thrown: unknown;

        try {
          await service.addShot(
            {
              Id: 'invalid-target',
              amount: 5,
              reason: 'Testing',
            },
            'Bearer signed-token',
          );
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeInstanceOf(HttpException);
        expect(thrown).toMatchObject({
          status: expectedHttpStatus,
          response: details,
        });
        expect(prisma.add.create).not.toHaveBeenCalled();
      },
    );

    it('propagates a database failure when creating a shot', async () => {
      memberGrpcService.resolveShotParticipants.mockReturnValueOnce(
        of({
          fromId: 'sender-id',
          toId: 'target-id',
        }),
      );

      const databaseError = new Error('Database unavailable');
      prisma.add.create.mockRejectedValueOnce(databaseError);

      await expect(
        service.addShot(
          {
            Id: 'target-id',
            amount: 5,
            reason: 'Testing',
          },
          'Bearer signed-token',
        ),
      ).rejects.toBe(databaseError);
    });
  });

  describe('recentActivity', () => {
    it('resolves member names through gRPC', async () => {
      const createdAt = new Date('2026-07-19T10:00:00.000Z');

      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'member-2',
          amount: 2,
          reason: 'Testing',
          createdAt,
          acceptedId: null,
          status: approveStatus.PENDING,
        },
      ]);

      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            {
              id: 'member-1',
              name: 'Anna',
            },
            {
              id: 'member-2',
              name: 'Erik',
            },
          ],
        }),
      );

      const result = await service.recentActivity('Bearer signed-token');

      expect(memberGrpcService.resolveMemberNames).toHaveBeenCalledWith(
        {
          ids: ['member-1', 'member-2'],
        },
        expect.any(Metadata),
      );

      expect(result).toEqual([
        {
          id: 'shot-1',
          fromName: 'Anna',
          toName: 'Erik',
          amount: 2,
          reason: 'Testing',
          status: approveStatus.PENDING,
          acceptedByName: null,
          createdAt,
        },
      ]);
    });

    it('resolves the reviewer name from acceptedId', async () => {
      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'member-2',
          acceptedId: 'reviewer-1',
          amount: 2,
          reason: 'Testing',
          status: approveStatus.APPROVED,
          createdAt: new Date(),
        },
      ]);
      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            { id: 'member-1', name: 'Anna' },
            { id: 'member-2', name: 'Erik' },
            { id: 'reviewer-1', name: 'Stina' },
          ],
        }),
      );

      const result = await service.recentActivity('Bearer signed-token');

      expect(memberGrpcService.resolveMemberNames).toHaveBeenCalledWith(
        { ids: ['member-1', 'member-2', 'reviewer-1'] },
        expect.any(Metadata),
      );
      expect(result[0]).toMatchObject({
        status: approveStatus.APPROVED,
        acceptedByName: 'Stina',
      });
    });

    it('loads the next three records using skip', async () => {
      const shots = Array.from({ length: 3 }, (_, index) => ({
        id: `shot-${index + 1}`,
        fromId: 'member-1',
        toId: 'member-2',
        amount: 1,
        reason: `Reason ${index + 1}`,
        createdAt: new Date(2026, 6, 20, 12, 0, -index),
        acceptedId: null,
        status: approveStatus.PENDING,
      }));
      prisma.add.findMany.mockResolvedValueOnce(shots);
      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            { id: 'member-1', name: 'Anna' },
            { id: 'member-2', name: 'Erik' },
          ],
        }),
      );

      const result = await service.recentActivity('Bearer signed-token', 3);

      expect(prisma.add.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 3,
          take: 3,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(result).toHaveLength(3);
    });

    it('forwards the JWT when resolving member names', async () => {
      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'member-2',
          amount: 2,
          reason: 'Testing metadata',
          createdAt: new Date(),
          acceptedId: null,
          status: approveStatus.PENDING,
        },
      ]);

      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            { id: 'member-1', name: 'Anna' },
            { id: 'member-2', name: 'Erik' },
          ],
        }),
      );

      const authorization = 'Bearer signed-token';
      await service.recentActivity(authorization);

      const metadata = memberGrpcService.resolveMemberNames.mock
        .calls[0][1] as Metadata;
      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it('does not call member-api when there is no recent activity', async () => {
      prisma.add.findMany.mockResolvedValueOnce([]);

      const result = await service.recentActivity('Bearer signed-token');

      expect(result).toEqual([]);

      expect(memberGrpcService.resolveMemberNames).not.toHaveBeenCalled();
    });
    it.each([
      { grpcCode: 3, expectedHttpStatus: 400 },
      { grpcCode: 5, expectedHttpStatus: 404 },
      { grpcCode: 7, expectedHttpStatus: 403 },
      { grpcCode: 16, expectedHttpStatus: 401 },
      { grpcCode: 13, expectedHttpStatus: 500 },
    ])(
      'maps member-name gRPC code $grpcCode to HTTP $expectedHttpStatus without exposing downstream details',
      async ({ grpcCode, expectedHttpStatus }) => {
        prisma.add.findMany.mockResolvedValueOnce([
          {
            id: 'shot-1',
            fromId: 'member-1',
            toId: 'member-2',
            amount: 2,
            reason: 'Testing',
            createdAt: new Date(),
            acceptedId: null,
            status: approveStatus.PENDING,
          },
        ]);

        memberGrpcService.resolveMemberNames.mockReturnValueOnce(
          throwError(() => ({
            code: grpcCode,
            details: 'Sensitive downstream details',
          })),
        );

        // recentActivity intentionally exposes one stable message to HTTP callers.
        await expect(
          service.recentActivity('Bearer signed-token'),
        ).rejects.toMatchObject({
          status: expectedHttpStatus,
          response: 'Could not load recent activity',
        });
      },
    );

    it('deduplicates member IDs before resolving names', async () => {
      const createdAt = new Date();

      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'member-2',
          amount: 1,
          reason: 'First',
          createdAt,
          acceptedId: null,
          status: approveStatus.PENDING,
        },
        {
          id: 'shot-2',
          fromId: 'member-2',
          toId: 'member-1',
          amount: 2,
          reason: 'Second',
          createdAt,
          acceptedId: null,
          status: approveStatus.PENDING,
        },
      ]);

      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            { id: 'member-1', name: 'Anna' },
            { id: 'member-2', name: 'Erik' },
          ],
        }),
      );

      await service.recentActivity('Bearer signed-token');

      expect(memberGrpcService.resolveMemberNames).toHaveBeenCalledWith(
        {
          ids: ['member-1', 'member-2'],
        },
        expect.any(Metadata),
      );
    });

    it('uses a fallback when a member name cannot be resolved', async () => {
      const createdAt = new Date('2026-07-19T10:00:00.000Z');

      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'missing-member',
          amount: 2,
          reason: 'Testing',
          createdAt,
          acceptedId: null,
          status: approveStatus.PENDING,
        },
      ]);

      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            {
              id: 'member-1',
              name: 'Anna',
            },
          ],
        }),
      );

      const result = await service.recentActivity('Bearer signed-token');

      expect(result[0]).toMatchObject({
        fromName: 'Anna',
        toName: 'Okänd medlem',
      });
    });
  });
  describe('onModuleInit', () => {
    it('resolves the MemberService from the gRPC client', () => {
      expect(grpcClient.getService).toHaveBeenCalledWith('MemberService');
    });
  });

  describe('addShot - error edge cases', () => {
    it('falls back to a default message when the gRPC error has no details', async () => {
      memberGrpcService.resolveShotParticipants.mockReturnValueOnce(
        throwError(() => ({ code: 5 })), // no `details` field
      );

      await expect(
        service.addShot(
          { Id: 'target-id', amount: 5, reason: 'Testing' },
          'Bearer signed-token',
        ),
      ).rejects.toMatchObject({
        status: 404,
        response: 'Could not validate shot participants',
      });
    });

    it('defaults to code 13 -> 500 when the thrown error is not an object', async () => {
      memberGrpcService.resolveShotParticipants.mockReturnValueOnce(
        throwError(() => 'a plain string rejection'),
      );

      await expect(
        service.addShot(
          { Id: 'target-id', amount: 5, reason: 'Testing' },
          'Bearer signed-token',
        ),
      ).rejects.toMatchObject({
        status: 500,
        response: 'Could not validate shot participants',
      });
    });
  });

  describe('recentActivity - skip validation', () => {
    beforeEach(() => {
      prisma.add.findMany.mockResolvedValue([]);
    });

    it('defaults to 0 when skip is 0', async () => {
      await service.recentActivity('Bearer signed-token', 0);
      expect(prisma.add.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('defaults to 0 when skip is negative', async () => {
      await service.recentActivity('Bearer signed-token', -5);
      expect(prisma.add.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('defaults to 0 when skip is not an integer', async () => {
      await service.recentActivity('Bearer signed-token', 1.5);
      expect(prisma.add.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });

  describe('recentActivity - member id handling', () => {
    it('does not duplicate memberIds when acceptedId matches fromId or toId', async () => {
      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'member-2',
          acceptedId: 'member-1', // same as fromId
          amount: 2,
          reason: 'Testing',
          createdAt: new Date(),
          status: approveStatus.APPROVED,
        },
      ]);
      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            { id: 'member-1', name: 'Anna' },
            { id: 'member-2', name: 'Erik' },
          ],
        }),
      );

      await service.recentActivity('Bearer signed-token');

      expect(memberGrpcService.resolveMemberNames).toHaveBeenCalledWith(
        { ids: ['member-1', 'member-2'] }, // not ['member-1','member-2','member-1']
        expect.any(Metadata),
      );
    });

    it('returns null (not a fallback string) when the reviewer name cannot be resolved', async () => {
      prisma.add.findMany.mockResolvedValueOnce([
        {
          id: 'shot-1',
          fromId: 'member-1',
          toId: 'member-2',
          acceptedId: 'missing-reviewer',
          amount: 2,
          reason: 'Testing',
          createdAt: new Date(),
          status: approveStatus.APPROVED,
        },
      ]);
      memberGrpcService.resolveMemberNames.mockReturnValueOnce(
        of({
          members: [
            { id: 'member-1', name: 'Anna' },
            { id: 'member-2', name: 'Erik' },
          ],
        }),
      );

      const result = await service.recentActivity('Bearer signed-token');

      expect(result[0].acceptedByName).toBeNull();
    });
  });
});
