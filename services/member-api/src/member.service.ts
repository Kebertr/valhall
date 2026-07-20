import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@valhall/auth';
import { PrismaService } from './prisma.service';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.member.findMany({
      orderBy: {
        memberId: 'asc',
      },
      select: {
        memberId: true,
        name: true,
        godname: true,
        role: true,
        avatarUrl: true,
        status: true,
      },
    });
  }

  findShotTargets() {
    return this.prisma.member.findMany({
      where: { status: 'GUD' },
      orderBy: { godname: 'asc' },
      select: {
        id: true,
        name: true,
        godname: true,
      },
    });
  }

  findNamesByIds(ids: string[]) {
    return this.prisma.member.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  }

  async resolveShotParticipants(
    targetMemberRecordId: string,
    user: AuthenticatedUser,
  ) {
    const [sender, target] = await Promise.all([
      this.prisma.member.findUnique({
        where: { keycloakId: user.keycloakId },
        select: { id: true },
      }),
      this.prisma.member.findUnique({
        where: { id: targetMemberRecordId },
        select: { id: true, status: true },
      }),
    ]);

    if (!sender) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED, // 7
        details: 'Connect your member account first',
      });
    }

    if (!target) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND, // 5
        details: 'Member not found',
      });
    }

    if (sender.id === target.id) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT, // 3
        details: 'You cannot give shots to yourself',
      });
    }

    if (target.status !== 'GUD') {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT, // 3
        details: 'Only GUD members can receive shots',
      });
    }

    return { fromId: sender.id, toId: target.id };
  }
}
