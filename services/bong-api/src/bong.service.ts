import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

type ShotParticipants = {
  fromId: string;
  toId: string;
};

type MemberName = {
  id: string;
  name: string;
};

@Injectable()
export class BongService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  async recentActivity(authorization: string) {
    const shots = await this.prisma.add.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fromId: true,
        toId: true,
        amount: true,
        reason: true,
        createdAt: true,
      },
    });
    if (shots.length === 0) {
      return [];
    }

    const memberIds: string[] = [];

    for (const shot of shots) {
      if (!memberIds.includes(shot.fromId)) {
        memberIds.push(shot.fromId);
      }

      if (!memberIds.includes(shot.toId)) {
        memberIds.push(shot.toId);
      }
    }

    const members = await this.resolveMemberNames(memberIds, authorization);

    return shots.map((shot) => {
      const sender = members.find((member) => member.id === shot.fromId);
      const receiver = members.find((member) => member.id === shot.toId);

      return {
        id: shot.id,
        fromName: sender?.name ?? 'Okänd medlem',
        toName: receiver?.name ?? 'Okänd medlem',
        amount: shot.amount,
        reason: shot.reason,
        createdAt: shot.createdAt,
      };
    });
  }

  private async resolveParticipants(
    targetMemberRecordId: string,
    authorization: string,
  ): Promise<ShotParticipants> {
    const memberApiUrl = this.config
      .get<string>('MEMBER_API_URL', 'http://localhost:3002');
    const response = await fetch(
      `${memberApiUrl}/api/members/shot-participants`,
      {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetMemberRecordId }),
      },
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      throw new HttpException(
        body?.message ?? 'Could not validate shot participants',
        response.status,
      );
    }

    return (await response.json()) as ShotParticipants;
  }

  private async resolveMemberNames(
    ids: string[],
    authorization: string,
  ): Promise<MemberName[]> {
    const memberApiUrl = this.config
      .get<string>('MEMBER_API_URL', 'http://localhost:3002');
    const response = await fetch(`${memberApiUrl}/api/members/resolve-names`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new HttpException(
        'Could not load recent activity',
        response.status,
      );
    }

    return (await response.json()) as MemberName[];
  }
}
