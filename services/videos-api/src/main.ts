import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VideosModule } from './video.module';
import { join } from 'path';
import { PrometheusService } from './prometheus.service';
import promBundle from 'express-prom-bundle';

async function bootstrap() {
  const app = await NestFactory.create(VideosModule);

  const prometheusService = app.get(PrometheusService);

  app.use(
    promBundle({
      includeMethod: true,
      includePath: true,
      includeStatusCode: true,
      promRegistry: prometheusService.register,
      autoregister: false,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'member',
      protoPath: join(process.cwd(), '../../proto/member.proto'),
      url: process.env.VIDEO_GRPC_BIND_URL ?? '0.0.0.0:50052',
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  const config = new DocumentBuilder()
    .setTitle('Valhall videos API')
    .setDescription('Uploading videos to minio S3')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'keycloak',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/videos/docs', app, documentFactory);

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3003);
}
void bootstrap();
