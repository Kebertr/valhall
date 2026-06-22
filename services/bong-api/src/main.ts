import { NestFactory } from '@nestjs/core';
import { BongModule } from './bong.module';

async function bootstrap() {
  const app = await NestFactory.create(BongModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
