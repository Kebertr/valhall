import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from '@valhall/auth';
import * as Minio from 'minio';
import { join } from 'path';
import { MINIO_TOKEN } from './minio.constants';
import { MinioVideoController } from './minio-video.controller';
import { MinioVideoService } from './minio-video.service';
import { PrismaService } from './prisma.service';
import { VideoGrpcController } from './video-grpc.controller';
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
            protoPath: join(process.cwd(), '../../proto/member/member.proto'),
            url: config.get<string>('MEMBER_GRPC_URL') ?? 'localhost:50051',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [MinioVideoController, VideoGrpcController, PrometheusController],
  providers: [
    {
      provide: MINIO_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Minio.Client({
          endPoint: configService.getOrThrow<string>('MINIO_ENDPOINT'),
          port: Number(configService.getOrThrow<string>('MINIO_PORT')),
          accessKey: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
          secretKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
          useSSL: configService.get<string>('MINIO_USE_SSL') === 'true',
        }),
    },
    MinioVideoService,
    PrismaService,
    PrometheusService,
  ],
})
export class VideosModule {}
