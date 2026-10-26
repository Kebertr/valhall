import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@valhall/auth';
import { PrismaService } from './prisma.service';

type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};

@Injectable()
export class RegisteredMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const keycloakId = request.user?.keycloakId;

    if (!keycloakId) {
      throw new ForbiddenException('Member account is not linked');
    }

    const member = await this.prisma.member.findUnique({
      where: { keycloakId },
      select: { id: true },
    });

    if (!member) {
      throw new ForbiddenException('Member account is not linked');
    }

    return true;
  }
}
