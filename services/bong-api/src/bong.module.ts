import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { BongController } from './bong.controller';
import { BongService } from './bong.service';
import { PrismaService } from './prisma.service';
import { RedemptionService } from './redemption.service';
import { RedemptionController } from './redemption.controller';
import { AuthModule } from '@valhall/auth';
import { BongmeisterController } from './bongmeister.controller';
import { BongmeisterService } from './bongmeister.service';

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
            url: config.get('MEMBER_GRPC_URL', 'localhost:50051'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BongController, RedemptionController, BongmeisterController],
  providers: [
    BongService,
    PrismaService,
    RedemptionService,
    BongmeisterService,
  ],
})
export class BongModule {}
