import {
  BadRequestException,
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
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { approveStatus } from './generated/prisma/browser';
import type {
  CompleteVideoUploadResponse,
  GetPostUploadResponse,
  MemberName,
  MemberServiceClient,
  ResolveCurrentMemberResponse,
  VideoServiceClient,
} from '@valhall/contracts';
import { mapGrpcToHttpStatus, toGrpcError } from '@valhall/contracts';
import { Prisma } from './generated/prisma/client';



type PenaltyRow = Prisma.AddGetPayload<{
  select: {
    id: true;
    toId: true;
    acceptedId: true;
    amount: true;
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

    const upload = await this.getPostUpload({filename: body.filename, contentType: body.contentType, sizeBytes: body.sizeBytes}, metadata);

    return this.prisma.$transaction(
      async (base) => {
        const balance = await base.bongBalance.findUnique({
          where: {
            memberId: member.id,
          },
        });

        //This is only to make the error clear so we know that bongmeister need to add one to bongbalance
        if (!balance) {
          throw new ConflictException('Bongmeister has not added this profile');
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

    await this.completeVideoUpload({videoId: redemptionId}, metadata)
  }

  async recentRedemptions(authorization: string, skip = 0) {

    if (skip < 0){
      throw new BadRequestException("Skip must be larger than 0")
    }
    const metadata = this.buildMetadata(authorization);
    const take = 3;
    const penalties = await this.prisma.redemption.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      //We check if there exists one take+1 in the database from the skip position. This is so we know if the client can click more button again
      take: take + 1,
      select: {
        id: true,
        toId: true,
        acceptedId: true,
        amount: true,
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
      nextSkip: skip + selected.length,
      hasMore,
    };
  }

  private getMemberId(selected: PenaltyRow[]) {
    const memberIds: string[] = [];
    for (const penalty of selected) {
      if (!memberIds.includes(penalty.toId)) memberIds.push(penalty.toId);
      if (penalty.acceptedId && !memberIds.includes(penalty.acceptedId)) {
        memberIds.push(penalty.acceptedId);
      }
    }
    return memberIds;
  }

  private toReturnPenalty(penalty: PenaltyRow, members: MemberName[]) {
    //Finding the name for each member in the penalty request. Using find since it is at most take*3 entries.
    const receiver = members.find((m) => m.id === penalty.toId);
    const reviewer = members.find((m) => m.id === penalty.acceptedId);
    return {
      id: penalty.id,
      toName: receiver?.name ?? 'Okänd medlem',
      amount: penalty.amount,
      status: penalty.status,
      acceptedByName: reviewer?.name ?? null,
      createdAt: penalty.createdAt,
    };
  }

  private buildMetadata(authorization: string) {
    const metadata = new Metadata();
    metadata.set('authorization', authorization);
    return metadata;
  }

  private async resolveCurrentMember(
      authorization: Metadata,
    ): Promise<ResolveCurrentMemberResponse> {
      try {
        //Since this is observable we need firstValueFrom
        return await firstValueFrom(
          this.memberService
            .resolveCurrentMember(
              authorization
            )
            //Timeout after 2 seconds
            .pipe(timeout(4000)),
        );
        //catching and Converting Grpc error to http
      } catch (error: unknown) {
        const grpcError = toGrpcError(error);
        throw new HttpException(
          grpcError.details ?? 'Could not validate penalty participants',
          mapGrpcToHttpStatus(grpcError.code),
        );
      }
    }

  private async getPostUpload(
    {
          filename,
          contentType,
          sizeBytes,
        },
      authorization: Metadata,
    ): Promise<GetPostUploadResponse> {
      try {
        return await firstValueFrom(
          this.videoService
            .getPostUpload({filename, contentType, sizeBytes},
              authorization
            )
            .pipe(timeout(4000)),
        );
        //catching and Converting Grpc error to http
      } catch (error: unknown) {
        const grpcError = toGrpcError(error);
        throw new HttpException(
          grpcError.details ?? 'Could not validate penalty participants',
          mapGrpcToHttpStatus(grpcError.code),
        );
      }
    }

  private async completeVideoUpload(
    {
          videoId: videoId,
        },
        metadata: Metadata,
    ): Promise<CompleteVideoUploadResponse> {
      try {
        return await firstValueFrom(
          this.videoService
            .completeVideoUpload({videoId},
              metadata
            )
            .pipe(timeout(4000)),
        );
        //catching and Converting Grpc error to http
      } catch (error: unknown) {
        const grpcError = toGrpcError(error);
        throw new HttpException(
          grpcError.details ?? 'Could not validate penalty participants',
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
        grpcError.details ?? 'Could not load recent activity',
        mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }
}
