import {
  HttpException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { Observable, firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';
import type { MemberServiceClient, MemberName, ResolveShotParticipantsResponse } from '@valhall/contracts'

@Injectable()
export class BongService implements OnModuleInit {
  private memberService!: MemberServiceClient;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MEMBER_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.client.getService<MemberServiceClient>('MemberService');
  }

  async addShot(
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
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async recentActivity(authorization: string, skip = 0) {
    const shots = await this.prisma.add.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: Number.isInteger(skip) && skip > 0 ? skip : 0,
      take: 3,
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

    if (shots.length === 0) {
      return [];
    }

    const memberIds: string[] = [];
    for (const shot of shots) {
      if (!memberIds.includes(shot.fromId)) memberIds.push(shot.fromId);
      if (!memberIds.includes(shot.toId)) memberIds.push(shot.toId);
      if (shot.acceptedId && !memberIds.includes(shot.acceptedId)) {
        memberIds.push(shot.acceptedId);
      }
    }

    const members = await this.resolveMemberNames(memberIds, authorization);

    return shots.map((shot) => {
      const sender = members.find((member) => member.id === shot.fromId);
      const receiver = members.find((member) => member.id === shot.toId);
      const reviewer = members.find((member) => member.id === shot.acceptedId);

      return {
        id: shot.id,
        fromName: sender?.name ?? 'Okänd medlem',
        toName: receiver?.name ?? 'Okänd medlem',
        amount: shot.amount,
        reason: shot.reason,
        status: shot.status,
        acceptedByName: reviewer?.name ?? null,
        createdAt: shot.createdAt,
      };
    });
  }

  private buildMetadata(authorization: string): Metadata {
    const metadata = new Metadata();
    metadata.add('authorization', authorization);
    return metadata;
  }

  private async resolveParticipants(
    targetMemberRecordId: string,
    authorization: string,
  ): Promise<ResolveShotParticipantsResponse> {
    try {
      return await firstValueFrom(
        this.memberService.resolveShotParticipants(
          { targetMemberRecordId },
          this.buildMetadata(authorization),
        ),
      );
    } catch (error: unknown) {
      const grpcError = this.toGrpcError(error);
      throw new HttpException(
        grpcError.details ?? 'Could not validate shot participants',
        this.mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }

  private async resolveMemberNames(
    ids: string[],
    authorization: string,
  ): Promise<MemberName[]> {
    try {
      const response = await firstValueFrom(
        this.memberService.resolveMemberNames(
          { ids },
          this.buildMetadata(authorization),
        ),
      );
      return response.members;
    } catch (error: unknown) {
      const grpcError = this.toGrpcError(error);
      throw new HttpException(
        'Could not load recent activity',
        this.mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }

  private toGrpcError(error: unknown): { code: number; details?: string } {
    if (typeof error !== 'object' || error === null) {
      return { code: 13 };
    }

    const code =
      'code' in error && typeof error.code === 'number' ? error.code : 13;
    const details =
      'details' in error && typeof error.details === 'string'
        ? error.details
        : undefined;

    return details ? { code, details } : { code };
  }

  private mapGrpcToHttpStatus(grpcCode: number): number {
    const map: Record<number, number> = {
      3: 400,
      5: 404,
      7: 403,
      16: 401,
    };
    return map[grpcCode] ?? 500;
  }
}
