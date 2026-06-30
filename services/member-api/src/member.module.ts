import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@valhall/auth';
import { MemberLinkService } from './member-link.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [MemberController],
  providers: [MemberService, MemberLinkService, PrismaService],
})
export class MemberModule {}
