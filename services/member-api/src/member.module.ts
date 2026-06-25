import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [MemberController],
  providers: [MemberService, PrismaService],
})
export class MemberModule {}
