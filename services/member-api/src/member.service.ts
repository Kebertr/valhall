import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@valhall/auth';
import { PrismaService } from './prisma.service';

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
    const [sender, target] = await this.prisma.$transaction([
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
      throw new ForbiddenException('Connect your member account first');
    }

    if (!target) {
      throw new NotFoundException('Member not found');
    }

    if (target.status !== 'GUD') {
      throw new BadRequestException('Only GUD members can receive shots');
    }

    return { fromId: sender.id, toId: target.id };
  }
}
