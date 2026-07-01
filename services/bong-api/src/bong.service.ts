import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@valhall/auth';
import { PrismaService } from './prisma.service';

@Injectable()
export class BongService {
  constructor(private readonly prisma: PrismaService) {}

  async addShot(
    body: { Id: string; amount: number; reason: string },
    user: AuthenticatedUser,
  ) {
    await this.prisma.add.create({
      data: {
        toId: body.Id,
        amount: body.amount,
        reason: body.reason,
        fromId: user.keycloakId,
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
}
