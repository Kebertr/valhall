import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { ClientGrpc } from '@nestjs/microservices';
import { CreateRedemptionDto } from './dto/redemption.dto';
import { firstValueFrom, timeout } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { approveStatus } from './generated/prisma/browser';
import type {
  CompleteVideoUploadResponse,
  CompleteVideoUploadRequest,
  GetPostUploadRequest,
  GetPostUploadResponse,
  MemberName,
  MemberServiceClient,
  ResolveCurrentMemberResponse,
  VideoServiceClient,
} from '@valhall/contracts';
import { mapGrpcToHttpStatus, toGrpcError } from '@valhall/contracts';
import { Prisma } from './generated/prisma/client';

type RedemptionRow = Prisma.RedemptionGetPayload<{
  select: {
    id: true;
    toId: true;
    acceptedId: true;
    amount: true;
    videoId: true;
    status: true;
    createdAt: true;
  };
}>;

@Injectable()
export class RedemptionService implements OnModuleInit {
  private memberService!: MemberServiceClient;
  private videoService!: VideoServiceClient;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MEMBER_PACKAGE') private readonly memberClient: ClientGrpc,
    @Inject('VIDEO_PACKAGE') private readonly videoClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.memberClient.getService<MemberServiceClient>('MemberService');

    this.videoService =
      this.videoClient.getService<VideoServiceClient>('VideoService');
  }

  async createRedemption(body: CreateRedemptionDto, authorization: string) {
    const metadata = this.buildMetadata(authorization);

    const member = await this.resolveCurrentMember(metadata);

    const upload = await this.getPostUpload(
      {
        filename: body.filename,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      },
      metadata,
    );

    return this.prisma.$transaction(
      async (base) => {
        const balance = await base.bongBalance.findUnique({
          where: {
            memberId: member.id,
          },
        });

        //This is only to make the error clear so we know that bongmeister need to add one to bongbalance
        if (!balance) {
          throw new ConflictException('Mästaren måste lägga till dig');
        }

        await base.bongBalance.update({
          where: {
            memberId: member.id,
          },
          data: {
            totalPending: {
              increment: body.penaltyAmount,
            },
          },
        });

        const redemption = await base.redemption.create({
          data: {
            toId: member.id,
            amount: body.penaltyAmount,
            videoId: upload.videoId,
            status: approveStatus.PENDING,
          },
        });

        return {
          redemptionId: redemption.id,
          videoId: upload.videoId,
          postUrl: upload.postUrl,
          formData: upload.formData,
        };
      },
      //This is for two requests to not read the same database state and do request that conflicts with each other
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async completeRedemptionUpload(redemptionId: string, authorization: string) {
    const metadata = this.buildMetadata(authorization);

    const member = await this.resolveCurrentMember(metadata);

    const redemption = await this.prisma.redemption.findFirst({
      where: {
        id: redemptionId,
        toId: member.id,
      },
    });

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    await this.completeVideoUpload({ videoId: redemption.videoId }, metadata);

    return {
      ok: true,
      redemptionId: redemption.id,
      message: 'Redemption upload completed',
    };
  }

  async recentRedemptions(authorization: string, skip = 0) {
    const normalizedSkip = Number.isInteger(skip) && skip >= 0 ? skip : 0;
    const metadata = this.buildMetadata(authorization);
    const take = 3;
    const penalties = await this.prisma.redemption.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: normalizedSkip,
      //We check if there exists one take+1 in the database from the skip position. This is so we know if the client can click more button again
      take: take + 1,
      select: {
        id: true,
        toId: true,
        acceptedId: true,
        amount: true,
        videoId: true,
        status: true,
        createdAt: true,
      },
    });

    const hasMore = penalties.length > take;
    const selected = penalties.slice(0, take);
    if (selected.length === 0) {
      return {
        returnPenalties: [],
        nextSkip: null,
        hasMore: false,
      };
    }

    const memberIds = this.getMemberId(selected);

    const members = await this.resolveMemberNames(memberIds, metadata);

    const returnPenalties = selected.map((penalty) =>
      this.toReturnPenalty(penalty, members),
    );

    return {
      returnPenalties,
      nextSkip: normalizedSkip + selected.length,
      hasMore,
    };
  }

  private getMemberId(selected: RedemptionRow[]) {
    const memberIds: string[] = [];
    for (const penalty of selected) {
      if (!memberIds.includes(penalty.toId)) memberIds.push(penalty.toId);
      if (penalty.acceptedId && !memberIds.includes(penalty.acceptedId)) {
        memberIds.push(penalty.acceptedId);
      }
    }
    return memberIds;
  }

  private toReturnPenalty(penalty: RedemptionRow, members: MemberName[]) {
    //Finding the name for each member in the penalty request. Using find since it is at most take*3 entries.
    const receiver = members.find((m) => m.id === penalty.toId);
    const reviewer = members.find((m) => m.id === penalty.acceptedId);
    return {
      id: penalty.id,
      memberName: receiver?.name ?? 'Okänd medlem',
      amount: penalty.amount,
      status: penalty.status,
      acceptedByName: reviewer?.name ?? null,
      createdAt: penalty.createdAt,
      videoId: penalty.videoId,
    };
  }

  private buildMetadata(authorization: string) {
    const metadata = new Metadata();
    metadata.set('authorization', authorization);
    return metadata;
  }

  private async resolveCurrentMember(
    metadata: Metadata,
  ): Promise<ResolveCurrentMemberResponse> {
    try {
      return await firstValueFrom(
        this.memberService
          .resolveCurrentMember({}, metadata)
          .pipe(timeout(4000)),
      );
    } catch (error: unknown) {
      const grpcError = toGrpcError(error);
      throw new HttpException(
        grpcError.details ??
          (error instanceof Error
            ? error.message
            : 'Could not resolve current member'),
        mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }

  private async getPostUpload(
    request: GetPostUploadRequest,
    metadata: Metadata,
  ): Promise<GetPostUploadResponse> {
    try {
      return await firstValueFrom(
        this.videoService.getPostUpload(request, metadata).pipe(timeout(4000)),
      );
    } catch (error: unknown) {
      const grpcError = toGrpcError(error);
      throw new HttpException(
        grpcError.details ??
          (error instanceof Error
            ? error.message
            : 'Could not create video upload'),
        mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }

  private async completeVideoUpload(
    request: CompleteVideoUploadRequest,
    metadata: Metadata,
  ): Promise<CompleteVideoUploadResponse> {
    try {
      return await firstValueFrom(
        this.videoService
          .completeVideoUpload(request, metadata)
          .pipe(timeout(4000)),
      );
    } catch (error: unknown) {
      const grpcError = toGrpcError(error);
      throw new HttpException(
        grpcError.details ??
          (error instanceof Error
            ? error.message
            : 'Could not complete video upload'),
        mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }

  private async resolveMemberNames(
    ids: string[],
    authorization: Metadata,
  ): Promise<MemberName[]> {
    try {
      const response = await firstValueFrom(
        this.memberService
          .resolveMemberNames({ ids }, authorization)
          .pipe(timeout(4000)),
      );
      return response.members;
    } catch (error: unknown) {
      const grpcError = toGrpcError(error);
      throw new HttpException(
        grpcError.details ??
          (error instanceof Error
            ? error.message
            : 'Could not load recent activity'),
        mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }
}
