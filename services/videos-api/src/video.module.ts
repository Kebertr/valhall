import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_TOKEN } from './minio.constants';
import { MinioVideoController } from './minio-video.controller';
import { MinioVideoService } from './minio-video.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [MinioVideoController],
  providers: [
    {
      provide: MINIO_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Minio.Client({
          endPoint:
            configService.getOrThrow<string>('MINIO_ENDPOINT'),
          port: Number(
            configService.getOrThrow<string>('MINIO_PORT'),
          ),
          accessKey:
            configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
          secretKey:
            configService.getOrThrow<string>('MINIO_SECRET_KEY'),
          useSSL: configService.get<string>('MINIO_USE_SSL') === 'true',
        }),
    },
    MinioVideoService,
  ],
})
export class VideosModule {}
