import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from './authenticated-user';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

type GrpcContextWithRequest = {
  request?: RequestWithUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request =
      context.getType() === 'http'
        ? context.switchToHttp().getRequest<RequestWithUser>()
        : context
            .switchToRpc()
            .getContext<GrpcContextWithRequest>()
            .request;

    if (!request?.user) {
      throw new UnauthorizedException(
        'User not authenticated',
      );
    }

    return request.user;
  },
);