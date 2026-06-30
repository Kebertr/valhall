import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MemberModule } from './member.module';

async function bootstrap() {
  const app = await NestFactory.create(MemberModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Valhall Member API')
    .setDescription('Members and profiles')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/member/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
