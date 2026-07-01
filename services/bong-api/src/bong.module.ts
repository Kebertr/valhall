import { Module } from '@nestjs/common';
import { BongController } from './bong.controller';
import { BongService } from './bong.service';
import { PrismaService } from './prisma.service';
import { RedemptionService } from './redemption.service';
import { RedemptionController } from './redemption.controller';
import { AuthModule } from '@valhall/auth';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [BongController, RedemptionController],
  providers: [BongService, PrismaService, RedemptionService],
})
export class BongModule {}
