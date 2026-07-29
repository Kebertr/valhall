import { NestFactory } from '@nestjs/core';
import { VideosModule } from './video.module';

async function bootstrap() {
  const app = await NestFactory.create(VideosModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
