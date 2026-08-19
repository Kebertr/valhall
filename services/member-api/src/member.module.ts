import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@valhall/auth';
import { MemberLinkService } from './member-link.service';
import { MemberGrpcController } from './membergRPC.controller';
import { PrometheusController } from './prometheus.controller';
import { PrometheusService } from './prometheus.service';
import { GrpcMetricsService } from './grpc-metrics.service';
import { GrpcMetricsInterceptor } from './grpc-metrics.interceptor';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [MemberController, MemberGrpcController, PrometheusController],
  providers: [MemberService, MemberLinkService, PrismaService, PrometheusService, GrpcMetricsService, GrpcMetricsInterceptor],
})
export class MemberModule {}
