import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { PenaltyController } from './penalty.controller';
import { PenaltyService } from './penalty.service';
import { PrismaService } from './prisma.service';
import { RedemptionService } from './redemption.service';
import { RedemptionController } from './redemption.controller';
import { AuthModule } from '@valhall/auth';
import { BongmeisterController } from './bongmeister.controller';
import { BongmeisterService } from './bongmeister.service';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { RecentService } from './recent.service';
import { RecentController } from './recent.controller';
import { PrometheusController } from './prometheus.controller';
import { PrometheusService } from './prometheus.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: 'MEMBER_PACKAGE',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'member',
            protoPath: join(process.cwd(), '../../proto/member.proto'),
            url: config.get<string>('MEMBER_GRPC_URL') ?? 'localhost:50051',
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'VIDEO_PACKAGE',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'video',
            protoPath: join(process.cwd(), '../../proto/video.proto'),
            url: config.get<string>('VIDEO_GRPC_URL') ?? 'localhost:50052',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    PenaltyController,
    RedemptionController,
    BongmeisterController,
    LeaderboardController,
    RecentController,
    PrometheusController,
  ],
  providers: [
    PenaltyService,
    PrismaService,
    RedemptionService,
    BongmeisterService,
    LeaderboardService,
    RecentService,
    PrometheusService,
  ],
})
export class PenaltyModule {}
