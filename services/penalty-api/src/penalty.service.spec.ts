import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { BadRequestException, HttpException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { NEVER, of, throwError } from 'rxjs';
import { approveStatus, type Add } from './generated/prisma/client';
import { PenaltyService } from './penalty.service';
import { PrismaService } from './prisma.service';

describe('PenaltyService', () => {
  let service: PenaltyService;
  let prisma: {
    add: {
      create: jest.MockedFunction<(args: unknown) => Promise<Add>>;
      findMany: jest.MockedFunction<(args: unknown) => Promise<Add[]>>;
    };
  };

  const authorization = 'Bearer abc123';
  const databaseDate = new Date('2026-08-20T10:00:00.000Z');
  const responseDate = new Date('2026-08-20T12:00:00.000Z');
  const validRequest = {
    Id: 'target-id',
    amount: 2,
    reason: 'Kom sent',
  };

  const memberService = {
    resolvePenaltyParticipants: jest.fn(),
    resolveMemberNames: jest.fn(),
  };

  const grpcClient = {
    getService: jest.fn(() => memberService),
  };

  function penaltyRow(id: string, overrides: Partial<Add> = {}): Add {
    return {
      id,
      fromId: `sender-${id}`,
      toId: `receiver-${id}`,
      acceptedId: null,
      amount: 2,
      reason: `Reason ${id}`,
      status: approveStatus.PENDING,
      createdAt: databaseDate,
      ...overrides,
    };
  }

  function resolveParticipantsAs(fromId = 'sender-id', toId = 'receiver-id') {
    memberService.resolvePenaltyParticipants.mockReturnValueOnce(
      of({ fromId, toId }),
    );
  }

  function resolveNamesAs(members: { id: string; name: string }[]) {
    memberService.resolveMemberNames.mockReturnValueOnce(of({ members }));
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    prisma = {
      add: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PenaltyService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MEMBER_PACKAGE', useValue: grpcClient },
      ],
    }).compile();

    service = testingModule.get(PenaltyService);
  });

  afterEach(() => jest.useRealTimers());

  describe('addPenalty', () => {
    beforeEach(() => service.onModuleInit());

    describe('when participant resolution and Prisma succeed', () => {
      it('resolves participants using the target ID and authorization header', async () => {
        // Arrange
        jest.useFakeTimers().setSystemTime(responseDate);
        resolveParticipantsAs('sender-id', 'receiver-id');
        prisma.add.create.mockResolvedValueOnce(penaltyRow('created'));

        // Act
        await service.addPenalty(validRequest, authorization);

        // Assert
        expect(memberService.resolvePenaltyParticipants).toHaveBeenCalledWith(
          { targetMemberRecordId: validRequest.Id },
          expect.any(Metadata),
        );

        const metadata =
          memberService.resolvePenaltyParticipants.mock.calls[0][1];

        expect(metadata).toBeInstanceOf(Metadata);
        expect(metadata.get('authorization')).toEqual([authorization]);
      });

      it('creates exactly one penalty without swapping sender and receiver', async () => {
        // Arrange
        resolveParticipantsAs('sender-id', 'receiver-id');
        prisma.add.create.mockResolvedValueOnce(penaltyRow('created'));

        // Act
        await service.addPenalty(validRequest, authorization);

        // Assert
        expect(prisma.add.create).toHaveBeenCalledTimes(1);
        expect(prisma.add.create).toHaveBeenCalledWith({
          data: {
            toId: 'receiver-id',
            fromId: 'sender-id',
            amount: validRequest.amount,
            reason: validRequest.reason,
          },
        });
      });

      it('returns a receipt containing the original request and creation time', async () => {
        // Arrange
        jest.useFakeTimers().setSystemTime(responseDate);
        resolveParticipantsAs('sender-id', 'receiver-id');
        prisma.add.create.mockResolvedValueOnce(penaltyRow('created'));

        // Act
        const result = await service.addPenalty(validRequest, authorization);

        // Assert
        expect(result).toEqual({
          ok: true,
          message: `Added ${validRequest.Id}`,
          received: {
            ...validRequest,
            status: 'pending',
            createdAt: responseDate.toISOString(),
          },
        });
      });
    });

    describe('when participant resolution fails', () => {
      it.each([
        { grpcCode: GrpcStatus.INVALID_ARGUMENT, httpStatus: 400 },
        { grpcCode: GrpcStatus.NOT_FOUND, httpStatus: 404 },
        { grpcCode: GrpcStatus.PERMISSION_DENIED, httpStatus: 403 },
        { grpcCode: GrpcStatus.UNAUTHENTICATED, httpStatus: 401 },
        { grpcCode: GrpcStatus.INTERNAL, httpStatus: 500 },
      ])(
        'maps gRPC code $grpcCode to HTTP $httpStatus and stops before Prisma',
        async ({ grpcCode, httpStatus }) => {
          memberService.resolvePenaltyParticipants.mockReturnValueOnce(
            throwError(() => ({
              code: grpcCode,
              details: 'Member does not exist',
            })),
          );

          await expect(
            service.addPenalty(validRequest, authorization),
          ).rejects.toMatchObject({
            status: httpStatus,
            response: 'Member does not exist',
          });
          expect(prisma.add.create).not.toHaveBeenCalled();
        },
      );

      it('uses a stable fallback message when gRPC provides no details', async () => {
        memberService.resolvePenaltyParticipants.mockReturnValueOnce(
          throwError(() => ({ code: GrpcStatus.NOT_FOUND })),
        );

        await expect(
          service.addPenalty(validRequest, authorization),
        ).rejects.toMatchObject({
          status: 404,
          response: 'Could not validate penalty participants',
        });
      });

      it('times out without waiting two real seconds or writing to Prisma', async () => {
        jest.useFakeTimers();
        memberService.resolvePenaltyParticipants.mockReturnValueOnce(NEVER);

        const operation = service.addPenalty(validRequest, authorization);
        let settled = false;
        void operation.then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          },
        );
        const rejection =
          expect(operation).rejects.toBeInstanceOf(HttpException);

        await jest.advanceTimersByTimeAsync(1999);
        expect(settled).toBe(false);

        await jest.advanceTimersByTimeAsync(1);
        await rejection;
        expect(prisma.add.create).not.toHaveBeenCalled();
      });
    });

    describe('when Prisma creation fails', () => {
      it('propagates the database error after one attempted write', async () => {
        // Arrange
        const calls: string[] = [];
        const databaseError = new Error('Database unavailable');
        memberService.resolvePenaltyParticipants.mockImplementationOnce(() => {
          calls.push('resolve participants');
          return of({ fromId: 'sender-id', toId: 'receiver-id' });
        });
        prisma.add.create.mockImplementationOnce(() => {
          calls.push('create penalty');
          return Promise.reject(databaseError);
        });

        // Act and assert
        await expect(
          service.addPenalty(validRequest, authorization),
        ).rejects.toBe(databaseError);

        expect(prisma.add.create).toHaveBeenCalledTimes(1);
        expect(calls).toEqual(['resolve participants', 'create penalty']);
      });
    });
  });

  describe('recentActivity', () => {
    beforeEach(() => service.onModuleInit());

    describe('skip validation and Prisma query', () => {
      it.each([0, 3])('accepts skip %s', async (skip) => {
        prisma.add.findMany.mockResolvedValueOnce([]);

        await service.recentActivity(authorization, skip);

        expect(prisma.add.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip }),
        );
      });

      it('rejects a negative skip before calling dependencies', async () => {
        await expect(service.recentActivity(authorization, -1)).rejects.toEqual(
          new BadRequestException('Skip needs to be larger than 0'),
        );

        expect(prisma.add.findMany).not.toHaveBeenCalled();
        expect(memberService.resolveMemberNames).not.toHaveBeenCalled();
      });

      it('requests three rows plus one pagination lookahead row', async () => {
        prisma.add.findMany.mockResolvedValueOnce([]);

        await service.recentActivity(authorization, 6);

        expect(prisma.add.findMany).toHaveBeenCalledWith({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 6,
          take: 4,
          select: {
            id: true,
            fromId: true,
            toId: true,
            acceptedId: true,
            amount: true,
            reason: true,
            status: true,
            createdAt: true,
          },
        });
      });

      it('propagates a Prisma query error without resolving member names', async () => {
        const databaseError = new Error('Query failed');
        prisma.add.findMany.mockRejectedValueOnce(databaseError);

        await expect(service.recentActivity(authorization)).rejects.toBe(
          databaseError,
        );
        expect(memberService.resolveMemberNames).not.toHaveBeenCalled();
      });
    });

    describe('pagination', () => {
      it('returns an empty page without resolving member names', async () => {
        prisma.add.findMany.mockResolvedValueOnce([]);

        const result = await service.recentActivity(authorization);

        expect(result).toEqual({
          returnPenalties: [],
          nextSkip: null,
          hasMore: false,
        });
        expect(memberService.resolveMemberNames).not.toHaveBeenCalled();
      });

      it.each([
        { rowCount: 1, skip: 0, expectedNextSkip: 1 },
        { rowCount: 2, skip: 0, expectedNextSkip: 2 },
        { rowCount: 3, skip: 0, expectedNextSkip: 3 },
        { rowCount: 3, skip: 6, expectedNextSkip: 9 },
      ])(
        'returns $rowCount rows from skip $skip with nextSkip $expectedNextSkip',
        async ({ rowCount, skip, expectedNextSkip }) => {
          const rows = Array.from({ length: rowCount }, (_, index) =>
            penaltyRow(`${index + 1}`),
          );
          prisma.add.findMany.mockResolvedValueOnce(rows);
          resolveNamesAs(
            rows.flatMap((row) => [
              { id: row.fromId, name: row.fromId },
              { id: row.toId, name: row.toId },
            ]),
          );

          const result = await service.recentActivity(authorization, skip);

          expect(result.returnPenalties).toHaveLength(rowCount);
          expect(result.nextSkip).toBe(expectedNextSkip);
          expect(result.hasMore).toBe(false);
        },
      );

      it('returns three rows and uses the fourth only to set hasMore', async () => {
        const rows = ['A', 'B', 'C', 'D'].map((id) => penaltyRow(id));
        prisma.add.findMany.mockResolvedValueOnce(rows);
        resolveNamesAs(
          rows.slice(0, 3).flatMap((row) => [
            { id: row.fromId, name: row.fromId },
            { id: row.toId, name: row.toId },
          ]),
        );

        const result = await service.recentActivity(authorization, 6);

        expect(result.returnPenalties.map(({ id }) => id)).toEqual([
          'A',
          'B',
          'C',
        ]);
        expect(result.nextSkip).toBe(9);
        expect(result.hasMore).toBe(true);

        const requestedIds = memberService.resolveMemberNames.mock.calls[0][0]
          .ids as string[];
        expect(requestedIds).not.toContain('sender-D');
        expect(requestedIds).not.toContain('receiver-D');
      });
    });

    describe('member lookup', () => {
      it('requests sender, receiver, and reviewer IDs with authorization', async () => {
        prisma.add.findMany.mockResolvedValueOnce([
          penaltyRow('1', {
            fromId: 'A',
            toId: 'B',
            acceptedId: 'C',
          }),
        ]);
        resolveNamesAs([
          { id: 'A', name: 'Alice' },
          { id: 'B', name: 'Bob' },
          { id: 'C', name: 'Reviewer' },
        ]);

        await service.recentActivity(authorization);

        expect(memberService.resolveMemberNames).toHaveBeenCalledWith(
          { ids: ['A', 'B', 'C'] },
          expect.any(Metadata),
        );

        const metadata = memberService.resolveMemberNames.mock.calls[0][1];

        expect(metadata).toBeInstanceOf(Metadata);
        expect(metadata.get('authorization')).toEqual([authorization]);
      });

      it('deduplicates IDs across multiple penalties', async () => {
        prisma.add.findMany.mockResolvedValueOnce([
          penaltyRow('1', { fromId: 'A', toId: 'B' }),
          penaltyRow('2', { fromId: 'A', toId: 'C' }),
        ]);
        resolveNamesAs([
          { id: 'A', name: 'Alice' },
          { id: 'B', name: 'Bob' },
          { id: 'C', name: 'Charlie' },
        ]);

        await service.recentActivity(authorization);

        expect(memberService.resolveMemberNames).toHaveBeenCalledWith(
          { ids: ['A', 'B', 'C'] },
          expect.any(Metadata),
        );
      });

      it.each([
        { acceptedId: 'A', description: 'sender' },
        { acceptedId: 'B', description: 'receiver' },
      ])(
        'does not duplicate acceptedId when it matches the $description',
        async ({ acceptedId }) => {
          prisma.add.findMany.mockResolvedValueOnce([
            penaltyRow('1', {
              fromId: 'A',
              toId: 'B',
              acceptedId,
            }),
          ]);
          resolveNamesAs([
            { id: 'A', name: 'Alice' },
            { id: 'B', name: 'Bob' },
          ]);

          await service.recentActivity(authorization);

          expect(memberService.resolveMemberNames).toHaveBeenCalledWith(
            { ids: ['A', 'B'] },
            expect.any(Metadata),
          );
        },
      );

      it('requests an ID once when sender and receiver are the same', async () => {
        prisma.add.findMany.mockResolvedValueOnce([
          penaltyRow('1', { fromId: 'A', toId: 'A' }),
        ]);
        resolveNamesAs([{ id: 'A', name: 'Alice' }]);

        await service.recentActivity(authorization);

        expect(memberService.resolveMemberNames).toHaveBeenCalledWith(
          { ids: ['A'] },
          expect.any(Metadata),
        );
      });

      it('does not request a null reviewer ID', async () => {
        prisma.add.findMany.mockResolvedValueOnce([
          penaltyRow('1', { fromId: 'A', toId: 'B', acceptedId: null }),
        ]);
        resolveNamesAs([
          { id: 'A', name: 'Alice' },
          { id: 'B', name: 'Bob' },
        ]);

        await service.recentActivity(authorization);

        expect(memberService.resolveMemberNames).toHaveBeenCalledWith(
          { ids: ['A', 'B'] },
          expect.any(Metadata),
        );
      });
    });

    describe('public response mapping', () => {
      it('returns the complete public shape without leaking internal IDs', async () => {
        const row = penaltyRow('penalty-1', {
          fromId: 'A',
          toId: 'B',
          acceptedId: 'C',
          reason: 'Kom sent',
          status: approveStatus.APPROVED,
        });
        prisma.add.findMany.mockResolvedValueOnce([row]);
        resolveNamesAs([
          { id: 'A', name: 'Alice' },
          { id: 'B', name: 'Bob' },
          { id: 'C', name: 'Reviewer' },
        ]);

        const result = await service.recentActivity(authorization);

        expect(result.returnPenalties[0]).toEqual({
          id: 'penalty-1',
          fromName: 'Alice',
          toName: 'Bob',
          amount: 2,
          reason: 'Kom sent',
          status: approveStatus.APPROVED,
          acceptedByName: 'Reviewer',
          createdAt: databaseDate,
        });
      });

      it.each([
        {
          description: 'both participants are unknown',
          members: [],
          expectedFromName: 'Okänd medlem',
          expectedToName: 'Okänd medlem',
        },
        {
          description: 'only the sender is known',
          members: [{ id: 'A', name: 'Alice' }],
          expectedFromName: 'Alice',
          expectedToName: 'Okänd medlem',
        },
        {
          description: 'only the receiver is known',
          members: [{ id: 'B', name: 'Bob' }],
          expectedFromName: 'Okänd medlem',
          expectedToName: 'Bob',
        },
      ])(
        'uses fallback names when $description',
        async ({ members, expectedFromName, expectedToName }) => {
          prisma.add.findMany.mockResolvedValueOnce([
            penaltyRow('1', { fromId: 'A', toId: 'B' }),
          ]);
          resolveNamesAs(members);

          const result = await service.recentActivity(authorization);

          expect(result.returnPenalties[0]).toMatchObject({
            fromName: expectedFromName,
            toName: expectedToName,
          });
        },
      );

      it('returns null when there is no reviewer', async () => {
        prisma.add.findMany.mockResolvedValueOnce([
          penaltyRow('1', { acceptedId: null }),
        ]);
        resolveNamesAs([]);

        const result = await service.recentActivity(authorization);

        expect(result.returnPenalties[0].acceptedByName).toBeNull();
      });

      it('returns null when the reviewer cannot be resolved', async () => {
        prisma.add.findMany.mockResolvedValueOnce([
          penaltyRow('1', { acceptedId: 'missing-reviewer' }),
        ]);
        resolveNamesAs([]);

        const result = await service.recentActivity(authorization);

        expect(result.returnPenalties[0].acceptedByName).toBeNull();
      });
    });

    describe('member lookup failures', () => {
      it.each([
        { grpcCode: GrpcStatus.INVALID_ARGUMENT, httpStatus: 400 },
        { grpcCode: GrpcStatus.NOT_FOUND, httpStatus: 404 },
        { grpcCode: GrpcStatus.PERMISSION_DENIED, httpStatus: 403 },
        { grpcCode: GrpcStatus.UNAUTHENTICATED, httpStatus: 401 },
        { grpcCode: GrpcStatus.INTERNAL, httpStatus: 500 },
      ])(
        'maps gRPC code $grpcCode to HTTP $httpStatus and preserves details',
        async ({ grpcCode, httpStatus }) => {
          prisma.add.findMany.mockResolvedValueOnce([penaltyRow('1')]);
          memberService.resolveMemberNames.mockReturnValueOnce(
            throwError(() => ({
              code: grpcCode,
              details: 'Member lookup failed',
            })),
          );

          await expect(
            service.recentActivity(authorization),
          ).rejects.toMatchObject({
            status: httpStatus,
            response: 'Member lookup failed',
          });
        },
      );

      it('uses a stable fallback message when gRPC provides no details', async () => {
        prisma.add.findMany.mockResolvedValueOnce([penaltyRow('1')]);
        memberService.resolveMemberNames.mockReturnValueOnce(
          throwError(() => ({ code: GrpcStatus.UNAVAILABLE })),
        );

        await expect(
          service.recentActivity(authorization),
        ).rejects.toMatchObject({
          response: 'Could not load recent activity',
        });
      });

      it('times out without returning partial activity', async () => {
        jest.useFakeTimers();
        prisma.add.findMany.mockResolvedValueOnce([penaltyRow('1')]);
        memberService.resolveMemberNames.mockReturnValueOnce(NEVER);

        const operation = service.recentActivity(authorization);
        const rejection =
          expect(operation).rejects.toBeInstanceOf(HttpException);

        await jest.advanceTimersByTimeAsync(2000);
        await rejection;
      });
    });
  });
});
