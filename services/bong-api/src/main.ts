import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { BongModule } from './bong.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(BongModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors();
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Valhall Bong API')
    .setDescription('Shots and redemptions')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'keycloak',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/bong/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
