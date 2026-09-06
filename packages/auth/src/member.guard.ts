import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import type { MemberServiceClient } from '@valhall/contracts';
import {
  mapGrpcToHttpStatus,
  toGrpcError,
} from '@valhall/contracts';

@Injectable()
export class RegisteredMemberGuard
  implements CanActivate, OnModuleInit
{
  private memberService!: MemberServiceClient;

  constructor(
    @Inject('MEMBER_PACKAGE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.client.getService<MemberServiceClient>(
        'MemberService',
      );
  }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Authorization header missing',
      );
    }

    const metadata = new Metadata();
    metadata.set('authorization', authorization);

    try {
      await firstValueFrom(
        this.memberService.resolveCurrentMember(
          {},
          metadata,
        ),
      );

      return true;
    } catch (error) {
      const grpcError = toGrpcError(error);

      throw new HttpException(
        grpcError.details ?? 'Could not verify member',
        mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }
}