import { ConflictException, NotFoundException } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { of, throwError } from 'rxjs';
import { RedemptionService } from './redemption.service';
import { approveStatus } from './generated/prisma/browser';

describe('RedemptionService', () => {
  const memberId = 'member-1';
  const reviewerId = 'reviewer-1';
  const redemptionId = 'redemption-1';
  const videoId = 'video-1';
  const authorization = 'Bearer test-token';

  const createdAt = new Date('2026-08-06T12:00:00.000Z');

  let service: RedemptionService;

  let prisma: {
    $transaction: jest.Mock;
    redemption: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };

  let transactionClient: {
    bongBalance: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    redemption: {
      create: jest.Mock;
    };
  };

  let memberService: {
    resolveCurrentMember: jest.Mock;
    resolveMemberNames: jest.Mock;
  };

  let videoService: {
    getPostUpload: jest.Mock;
    completeVideoUpload: jest.Mock;
  };

  let memberClient: {
    getService: jest.Mock;
  };

  let videoClient: {
    getService: jest.Mock;
  };

  beforeEach(() => {
    transactionClient = {
      bongBalance: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      redemption: {
        create: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn(),
      redemption: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    memberService = {
      resolveCurrentMember: jest.fn(),
      resolveMemberNames: jest.fn(),
    };

    videoService = {
      getPostUpload: jest.fn(),
      completeVideoUpload: jest.fn(),
    };

    memberClient = {
      getService: jest.fn().mockReturnValue(memberService),
    };

    videoClient = {
      getService: jest.fn().mockReturnValue(videoService),
    };

    service = new RedemptionService(
      prisma as never,
      memberClient as never,
      videoClient as never,
    );

    service.onModuleInit();

    prisma.$transaction.mockImplementation(
      async (
        callback: (client: typeof transactionClient) => Promise<unknown>,
      ) => callback(transactionClient),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize the member and video gRPC services', () => {
      expect(memberClient.getService).toHaveBeenCalledWith('MemberService');

      expect(videoClient.getService).toHaveBeenCalledWith('VideoService');
    });
  });

  describe('createRedemption', () => {
    const body = {
      filename: 'redemption.mp4',
      contentType: 'video/mp4',
      sizeBytes: 10_000,
      penaltyAmount: 5,
    };

    beforeEach(() => {
      memberService.resolveCurrentMember.mockReturnValue(
        of({
          id: memberId,
        }),
      );

      videoService.getPostUpload.mockReturnValue(
        of({
          videoId,
          postUrl: 'https://upload.example.com',
          formData: {
            key: 'uploads/video-1',
            policy: 'test-policy',
          },
        }),
      );

      transactionClient.bongBalance.findUnique.mockResolvedValue({
        memberId,
        totalAdded: 20,
        totalTaken: 5,
        totalPending: 2,
      });

      transactionClient.bongBalance.update.mockResolvedValue({
        memberId,
        totalAdded: 20,
        totalTaken: 5,
        totalPending: 7,
      });

      transactionClient.redemption.create.mockResolvedValue({
        id: redemptionId,
        toId: memberId,
        amount: body.penaltyAmount,
        videoId,
        status: approveStatus.PENDING,
      });
    });

    it('should create a pending redemption and return upload information', async () => {
      const result = await service.createRedemption(body, authorization);

      expect(result).toEqual({
        redemptionId,
        videoId,
        postUrl: 'https://upload.example.com',
        formData: {
          key: 'uploads/video-1',
          policy: 'test-policy',
        },
      });
    });

    it('should resolve the current member using authorization metadata', async () => {
      await service.createRedemption(body, authorization);

      expect(memberService.resolveCurrentMember).toHaveBeenCalledTimes(1);

      const [request, metadata] = memberService.resolveCurrentMember.mock
        .calls[0] as [Record<string, never>, Metadata];

      expect(request).toEqual({});
      expect(metadata).toBeInstanceOf(Metadata);
      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it('should request a presigned upload from the video service', async () => {
      await service.createRedemption(body, authorization);

      expect(videoService.getPostUpload).toHaveBeenCalledTimes(1);

      const [request, metadata] = videoService.getPostUpload.mock.calls[0] as [
        {
          filename: string;
          contentType: string;
          sizeBytes: number;
        },
        Metadata,
      ];

      expect(request).toEqual({
        filename: body.filename,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      });

      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it('should run the database operations in a serializable transaction', async () => {
      await service.createRedemption(body, authorization);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('should look up the balance belonging to the current member', async () => {
      await service.createRedemption(body, authorization);

      expect(transactionClient.bongBalance.findUnique).toHaveBeenCalledWith({
        where: {
          memberId,
        },
      });
    });

    it('should increment totalPending by the requested amount', async () => {
      await service.createRedemption(body, authorization);

      expect(transactionClient.bongBalance.update).toHaveBeenCalledWith({
        where: {
          memberId,
        },
        data: {
          totalPending: {
            increment: body.penaltyAmount,
          },
        },
      });
    });

    it('should create the redemption with pending status', async () => {
      await service.createRedemption(body, authorization);

      expect(transactionClient.redemption.create).toHaveBeenCalledWith({
        data: {
          toId: memberId,
          amount: body.penaltyAmount,
          videoId,
          status: approveStatus.PENDING,
        },
      });
    });

    it('should allow redemption when available balance exactly equals the requested amount', async () => {
      transactionClient.bongBalance.findUnique.mockResolvedValue({
        memberId,
        totalAdded: 10,
        totalTaken: 3,
        totalPending: 2,
      });

      const result = await service.createRedemption(
        {
          ...body,
          penaltyAmount: 5,
        },
        authorization,
      );

      expect(result.redemptionId).toBe(redemptionId);

      expect(transactionClient.bongBalance.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when the member has no balance record', async () => {
      transactionClient.bongBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.createRedemption(body, authorization),
      ).rejects.toThrow(new ConflictException('Mästaren måste lägga till dig'));

      expect(transactionClient.bongBalance.update).not.toHaveBeenCalled();

      expect(transactionClient.redemption.create).not.toHaveBeenCalled();
    });

    it('should not start a transaction when current-member resolution fails', async () => {
      memberService.resolveCurrentMember.mockReturnValue(
        throwError(() => new Error('Member service unavailable')),
      );

      await expect(
        service.createRedemption(body, authorization),
      ).rejects.toThrow('Member service unavailable');

      expect(videoService.getPostUpload).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should not start a transaction when video upload creation fails', async () => {
      videoService.getPostUpload.mockReturnValue(
        throwError(() => new Error('Video service unavailable')),
      );

      await expect(
        service.createRedemption(body, authorization),
      ).rejects.toThrow('Video service unavailable');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should propagate database errors', async () => {
      transactionClient.redemption.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createRedemption(body, authorization),
      ).rejects.toThrow('Database error');
    });
  });

  describe('completeRedemptionUpload', () => {
    beforeEach(() => {
      memberService.resolveCurrentMember.mockReturnValue(
        of({
          id: memberId,
        }),
      );

      prisma.redemption.findFirst.mockResolvedValue({
        id: redemptionId,
        toId: memberId,
        amount: 5,
        videoId,
        status: approveStatus.PENDING,
        acceptedId: null,
        createdAt,
      });

      videoService.completeVideoUpload.mockReturnValue(
        of({
          videoId,
        }),
      );
    });

    it('should complete the video upload and return confirmation', async () => {
      const result = await service.completeRedemptionUpload(
        redemptionId,
        authorization,
      );

      expect(result).toEqual({
        ok: true,
        redemptionId,
        message: 'Redemption upload completed',
      });
    });

    it('should only find a redemption belonging to the current member', async () => {
      await service.completeRedemptionUpload(redemptionId, authorization);

      expect(prisma.redemption.findFirst).toHaveBeenCalledWith({
        where: {
          id: redemptionId,
          toId: memberId,
        },
      });
    });

    it('should send the video ID and authorization to the video service', async () => {
      await service.completeRedemptionUpload(redemptionId, authorization);

      expect(videoService.completeVideoUpload).toHaveBeenCalledTimes(1);

      const [request, metadata] = videoService.completeVideoUpload.mock
        .calls[0] as [
        {
          videoId: string;
        },
        Metadata,
      ];

      expect(request).toEqual({
        videoId,
      });

      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it('should throw NotFoundException when the redemption does not exist', async () => {
      prisma.redemption.findFirst.mockResolvedValue(null);

      await expect(
        service.completeRedemptionUpload(redemptionId, authorization),
      ).rejects.toThrow(new NotFoundException('Redemption not found'));

      expect(videoService.completeVideoUpload).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the redemption belongs to another member', async () => {
      /*
       * findFirst returns null because the query includes:
       * {
       *   id: redemptionId,
       *   toId: currentMember.id
       * }
       */
      prisma.redemption.findFirst.mockResolvedValue(null);

      await expect(
        service.completeRedemptionUpload(redemptionId, authorization),
      ).rejects.toThrow('Redemption not found');

      expect(videoService.completeVideoUpload).not.toHaveBeenCalled();
    });

    it('should propagate errors from the video service', async () => {
      videoService.completeVideoUpload.mockReturnValue(
        throwError(() => new Error('Upload was not found')),
      );

      await expect(
        service.completeRedemptionUpload(redemptionId, authorization),
      ).rejects.toThrow('Upload was not found');
    });
  });

  describe('recentRedemptions', () => {
    const redemptions = [
      {
        id: 'redemption-3',
        toId: memberId,
        amount: 3,
        videoId: 'video-3',
        status: approveStatus.PENDING,
        createdAt: new Date('2026-08-06T12:00:00.000Z'),
        acceptedId: null,
      },
      {
        id: 'redemption-2',
        toId: 'member-2',
        amount: 4,
        videoId: 'video-2',
        status: approveStatus.APPROVED,
        createdAt: new Date('2026-08-05T12:00:00.000Z'),
        acceptedId: reviewerId,
      },
      {
        id: 'redemption-1',
        toId: memberId,
        amount: 2,
        videoId: 'video-1',
        status: approveStatus.REJECTED,
        createdAt: new Date('2026-08-04T12:00:00.000Z'),
        acceptedId: reviewerId,
      },
    ];

    beforeEach(() => {
      prisma.redemption.findMany.mockResolvedValue(redemptions);

      memberService.resolveMemberNames.mockReturnValue(
        of({
          members: [
            {
              id: memberId,
              name: 'Rasmus',
            },
            {
              id: 'member-2',
              name: 'Anna',
            },
            {
              id: reviewerId,
              name: 'Admin',
            },
          ],
        }),
      );
    });

    it('should fetch the three most recent redemptions', async () => {
      await service.recentRedemptions(authorization);

      expect(prisma.redemption.findMany).toHaveBeenCalledWith({
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip: 0,
        take: 3,
        select: {
          id: true,
          toId: true,
          amount: true,
          videoId: true,
          status: true,
          createdAt: true,
          acceptedId: true,
        },
      });
    });

    it('should use the supplied skip value', async () => {
      await service.recentRedemptions(authorization, 6);

      expect(prisma.redemption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 6,
          take: 3,
        }),
      );
    });

    it.each([[-1], [-100], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
      'should normalize invalid skip value %p to zero',
      async (invalidSkip) => {
        await service.recentRedemptions(authorization, invalidSkip);

        expect(prisma.redemption.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
          }),
        );
      },
    );

    it('should return an empty array without calling the member service when there are no redemptions', async () => {
      prisma.redemption.findMany.mockResolvedValue([]);

      const result = await service.recentRedemptions(authorization);

      expect(result).toEqual([]);

      expect(memberService.resolveMemberNames).not.toHaveBeenCalled();
    });

    it('should request names for receivers and reviewers without duplicate IDs', async () => {
      await service.recentRedemptions(authorization);

      expect(memberService.resolveMemberNames).toHaveBeenCalledTimes(1);

      const [request, metadata] = memberService.resolveMemberNames.mock
        .calls[0] as [
        {
          ids: string[];
        },
        Metadata,
      ];

      expect(request.ids).toEqual([memberId, 'member-2', reviewerId]);

      expect(metadata.get('authorization')).toEqual([authorization]);
    });

    it('should map member and reviewer names onto the redemptions', async () => {
      const result = await service.recentRedemptions(authorization);

      expect(result).toEqual([
        {
          id: 'redemption-3',
          memberName: 'Rasmus',
          amount: 3,
          status: approveStatus.PENDING,
          createdAt: new Date('2026-08-06T12:00:00.000Z'),
          videoId: 'video-3',
          acceptedByName: 'Okänd medlem',
        },
        {
          id: 'redemption-2',
          memberName: 'Anna',
          amount: 4,
          status: approveStatus.APPROVED,
          createdAt: new Date('2026-08-05T12:00:00.000Z'),
          videoId: 'video-2',
          acceptedByName: 'Admin',
        },
        {
          id: 'redemption-1',
          memberName: 'Rasmus',
          amount: 2,
          status: approveStatus.REJECTED,
          createdAt: new Date('2026-08-04T12:00:00.000Z'),
          videoId: 'video-1',
          acceptedByName: 'Admin',
        },
      ]);
    });

    it('should use fallback names when members cannot be resolved', async () => {
      memberService.resolveMemberNames.mockReturnValue(
        of({
          members: [],
        }),
      );

      const result = await service.recentRedemptions(authorization);

      expect(result[0].memberName).toBe('Okänd medlem');
      expect(result[0].acceptedByName).toBe('Okänd medlem');

      expect(result[1].memberName).toBe('Okänd medlem');
      expect(result[1].acceptedByName).toBe('Okänd medlem');
    });

    it('should propagate errors from the member service', async () => {
      memberService.resolveMemberNames.mockReturnValue(
        throwError(() => new Error('Member lookup failed')),
      );

      await expect(service.recentRedemptions(authorization)).rejects.toThrow(
        'Member lookup failed',
      );
    });

    it('should propagate database errors', async () => {
      prisma.redemption.findMany.mockRejectedValue(
        new Error('Database unavailable'),
      );

      await expect(service.recentRedemptions(authorization)).rejects.toThrow(
        'Database unavailable',
      );

      expect(memberService.resolveMemberNames).not.toHaveBeenCalled();
    });
  });
});
