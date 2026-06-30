import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from './authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return request.user;
  },
);
