import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from './prisma.service';
import type {
  MemberName,
  MemberServiceClient,
  ResolvePenaltyParticipantsResponse,
} from '@valhall/contracts';
import { approveStatus, Prisma } from './generated/prisma/client';
import {
  mapGrpcToHttpStatus,
  toGrpcError,
} from '@valhall/contracts';

//This is for not using any as type in getMemberId and toReturnPenalty
type PenaltyRow = Prisma.AddGetPayload<{
  select: {
    id: true;
    fromId: true;
    toId: true;
    acceptedId: true;
    amount: true;
    reason: true;
    status: true;
    createdAt: true;
  };
}>;

@Injectable()
export class PenaltyService implements OnModuleInit {
  private memberService!: MemberServiceClient;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MEMBER_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.client.getService<MemberServiceClient>('MemberService');
  }

  async addPenalty(
    body: { Id: string; amount: number; reason: string },
    authorization: string,
  ) {
    const participants = await this.resolveParticipants(body.Id, authorization);

    await this.prisma.add.create({
      data: {
        toId: participants.toId,
        amount: body.amount,
        reason: body.reason,
        fromId: participants.fromId,
      },
    });

    return {
      ok: true,
      message: `Added ${body.Id}`,
      received: {
        Id: body.Id,
        amount: body.amount,
        reason: body.reason,
        status: approveStatus.PENDING,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async recentActivity(authorization: string, skip = 0) {
    if (skip < 0) {
      throw new BadRequestException('Skip needs to be larger than 0');
    }

    const take = 3;
    const penalties = await this.prisma.add.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      //We check if there exists one take+1 in the database from the skip position. This is so we know if the client can click more button again
      take: take + 1,
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

    const members = await this.resolveMemberNames(memberIds, authorization);

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
      if (!memberIds.includes(penalty.fromId)) memberIds.push(penalty.fromId);
      if (!memberIds.includes(penalty.toId)) memberIds.push(penalty.toId);
      if (penalty.acceptedId && !memberIds.includes(penalty.acceptedId)) {
        memberIds.push(penalty.acceptedId);
      }
    }
    return memberIds;
  }

  private toReturnPenalty(penalty: PenaltyRow, members: MemberName[]) {
    //Finding the name for each member in the penalty request. Using find since it is at most take*3 entries.
    const sender = members.find((m) => m.id === penalty.fromId);
    const receiver = members.find((m) => m.id === penalty.toId);
    const reviewer = members.find((m) => m.id === penalty.acceptedId);
    return {
      id: penalty.id,
      fromName: sender?.name ?? 'Okänd medlem',
      toName: receiver?.name ?? 'Okänd medlem',
      amount: penalty.amount,
      reason: penalty.reason,
      status: penalty.status,
      acceptedByName: reviewer?.name ?? null,
      createdAt: penalty.createdAt,
    };
  }

  private buildMetadata(authorization: string): Metadata {
    const metadata = new Metadata();
    metadata.add('authorization', authorization);
    return metadata;
  }

  private async resolveParticipants(
    targetMemberRecordId: string,
    authorization: string,
  ): Promise<ResolvePenaltyParticipantsResponse> {
    try {
      //Since this is observable we need firstValueFrom
      return await firstValueFrom(
        this.memberService
          .resolvePenaltyParticipants(
            { targetMemberRecordId },
            this.buildMetadata(authorization),
          )
          //Timeout after 2 seconds
          .pipe(timeout(2000)),
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
    authorization: string,
  ): Promise<MemberName[]> {
    try {
      const response = await firstValueFrom(
        this.memberService
          .resolveMemberNames({ ids }, this.buildMetadata(authorization))
          .pipe(timeout(2000)),
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