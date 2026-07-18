import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from './authenticated-user';

type GrpcAuthRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};

type GrpcMetadata = {
  get(key: string): unknown[];
  request?: GrpcAuthRequest;
};

@Injectable()
export class GrpcJwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const metadata = context
      .switchToRpc()
      .getContext<GrpcMetadata>();

    if (!metadata.request) {
      const authorization =
        metadata.get('authorization')[0];

      metadata.request = {
        headers: {
          authorization:
            typeof authorization === 'string'
              ? authorization
              : undefined,
        },
      };
    }

    return metadata.request;
  }
}