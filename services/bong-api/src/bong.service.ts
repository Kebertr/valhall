import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class BongService {
  constructor(private readonly prisma: PrismaService) {}
  getHello(): string {
    return 'Hello World!';
  }

  async addShot(body: { name: string; amount: number; reason: string }) {
    await this.prisma.shot.create({
      data: {
        toName: body.name,
        amount: body.amount,
        reason: body.reason,
        fromName: 'Rasmus',
      },
    });
    return {
      ok: true,
      message: `Added ${body.name}`,
      received: {
        id: Math.floor(Math.random() * 1000),
        name: body.name,
        amount: body.amount,
        reason: body.reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }
}
