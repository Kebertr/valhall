import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RedemptionService {
  constructor(private readonly prisma: PrismaService) {}
  async RedemptionShot(body: { amount: number }) {
    await this.prisma.redemption.create({
      data: {
        toId: "Rasmus",
        amount: body.amount,
        videoUrl: "Url"
      },
    });
    return {
      ok: true,
      message: `redemed ${"Rasmus"}`,
      received: {
        Id: "Rasmus",
        amount: body.amount,
        reason: "url",
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }


}
