import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { MemberModule } from './member.module';
import { PrometheusService } from './prometheus.service';
import promBundle from 'express-prom-bundle';

async function bootstrap() {
  const app = await NestFactory.create(MemberModule);

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

  //This is for gRPC communication between the micro services
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'member',
      protoPath: join(process.cwd(), '../../proto/member.proto'),
      url: process.env.GRPC_URL ?? '0.0.0.0:50051',
      loader: {
        keepCase: false,
      },
    },
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  //Setting up for the swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Valhall Member API')
    .setDescription('Members and profiles')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'keycloak',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/member/docs', app, swaggerDocument);

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3002);
}

void bootstrap();
