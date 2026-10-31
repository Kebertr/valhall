import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from './prisma.service';
import { RegisteredMemberGuard } from './registered-member.guard';

describe('RegisteredMemberGuard', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let guard: RegisteredMemberGuard;

  function context(keycloakId?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: keycloakId ? { keycloakId } : undefined,
        }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    guard = new RegisteredMemberGuard(prisma);
  });

  it('allows a Keycloak user linked to a member record', async () => {
    prisma.member.findUnique.mockResolvedValueOnce({ id: 'member-id' });

    await expect(guard.canActivate(context('keycloak-id'))).resolves.toBe(true);
  });

  it('rejects a Keycloak user without a linked member record', async () => {
    prisma.member.findUnique.mockResolvedValueOnce(null);

    await expect(guard.canActivate(context('keycloak-id'))).rejects.toThrow(
      new ForbiddenException('Member account is not linked'),
    );
  });
});
