import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '@valhall/auth';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { MemberLinkService } from './member-link.service';
import { PrismaService } from './prisma.service';

jest.mock('./prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('MemberLinkService', () => {
  let service: MemberLinkService;
  let prisma: DeepMockProxy<PrismaService>;

  const member = {
    id: 'member-record-1',
    memberId: 1,
    keycloakId: null,
    name: 'Stina',
    godname: 'Freja',
    avatarUrl: null,
    status: 'GUD' as const,
    role: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user: AuthenticatedUser = {
    keycloakId: 'keycloak-user-1',
    emailVerified: true,
    roles: [],
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    const config = {
      getOrThrow: jest.fn(() => 'http://localhost:5173/'),
    } as unknown as ConfigService;
    service = new MemberLinkService(prisma, config);
  });

  describe('createLink', () => {
    it('creates a link for an unlinked member', async () => {
      prisma.member.findUnique.mockResolvedValueOnce(member);
      prisma.memberAccountLink.upsert.mockResolvedValueOnce({
        id: 'link-1',
        memberRecordId: member.id,
        tokenHash: 'stored-hash',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createLink(member.memberId);

      expect(result.url).toMatch(
        /^http:\/\/localhost:5173\/link-member#token=.+$/,
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(prisma.memberAccountLink.upsert).toHaveBeenCalledWith({
        where: { memberRecordId: member.id },
        create: {
          memberRecordId: member.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
        update: {
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          usedAt: null,
        },
      });
    });

    it('rejects an unknown member', async () => {
      prisma.member.findUnique.mockResolvedValueOnce(null);

      await expect(service.createLink(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.memberAccountLink.upsert).not.toHaveBeenCalled();
    });

    it('rejects a member that already has a Keycloak account', async () => {
      prisma.member.findUnique.mockResolvedValueOnce({
        ...member,
        keycloakId: 'existing-keycloak-id',
      });

      await expect(service.createLink(member.memberId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.memberAccountLink.upsert).not.toHaveBeenCalled();
    });
  });

  describe('consumeLink', () => {
    it('rejects an invalid or expired link', async () => {
      runTransactionWithPrismaMock();
      prisma.memberAccountLink.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.consumeLink('invalid-token', user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('prevents one Keycloak account from linking to two members', async () => {
      runTransactionWithPrismaMock();
      prisma.memberAccountLink.findUnique.mockResolvedValueOnce({
        id: 'link-1',
        memberRecordId: member.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt: new Date(),
      });
      prisma.member.findUnique.mockResolvedValueOnce({
        ...member,
        id: 'other-member-record',
        keycloakId: user.keycloakId,
      });

      await expect(
        service.consumeLink('valid-token', user),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.member.update).not.toHaveBeenCalled();
    });
  });

  function runTransactionWithPrismaMock() {
    prisma.$transaction.mockImplementation((operation: unknown) => {
      const callback = operation as (transaction: PrismaService) => unknown;
      return Promise.resolve(callback(prisma));
    });
  }
});
