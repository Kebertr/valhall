import { Injectable } from '@nestjs/common';
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
}
