import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@valhall/auth';
import { PrismaService } from './prisma.service';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import type { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  async createMember(body: CreateMemberDto) {
    try {
      return await this.prisma.member.create({
        data: {
          name: body.name,
          godname: body.godname,
          status: body.status,
          role: body.role,
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
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Gudnamnet används redan');
      }

      throw error;
    }
  }

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

  findUnlinked() {
    return this.prisma.member.findMany({
      where: { keycloakId: null },
      orderBy: { godname: 'asc' },
      select: {
        memberId: true,
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

  resolveCurrentMember(user: AuthenticatedUser) {
    return this.findCurrentMember(user);
  }

  async resolveShotParticipants(
    targetMemberRecordId: string,
    user: AuthenticatedUser,
  ) {
    const [sender, target] = await Promise.all([
      this.findCurrentMember(user),
      this.prisma.member.findUnique({
        where: { id: targetMemberRecordId },
        select: { id: true, status: true },
      }),
    ]);

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

  private async findCurrentMember(user: AuthenticatedUser) {
    const member = await this.prisma.member.findUnique({
      where: { keycloakId: user.keycloakId },
      select: { id: true },
    });

    if (!member) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        details: 'Connect your member account first',
      });
    }

    return member;
  }
}
