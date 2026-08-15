import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { GrpcJwtAuthGuard } from './gRPC-jwt-auth-guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, GrpcJwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, GrpcJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
