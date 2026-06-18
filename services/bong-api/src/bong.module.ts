import { Module } from '@nestjs/common';
import { BongController } from './bong.controller';
import { BongService } from './bong.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [BongController],
  providers: [BongService, PrismaService],
})
export class BongModule {}
