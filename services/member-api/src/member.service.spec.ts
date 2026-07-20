import { status as GrpcStatus } from '@grpc/grpc-js';
import type { AuthenticatedUser } from '@valhall/auth';
import { RpcException } from '@nestjs/microservices';
import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { MemberService } from './member.service';
import { PrismaService } from './prisma.service';

jest.mock('./prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('MemberService', () => {
  let service: MemberService;
  let prisma: DeepMockProxy<PrismaService>;

  const user: AuthenticatedUser = {
    keycloakId: 'keycloak-user-1',
    emailVerified: true,
    roles: [],
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(MemberService);
  });

  describe('findAll', () => {
    it('lists all members ordered by memberId', async () => {
      prisma.member.findMany.mockResolvedValueOnce([]);

      await service.findAll();

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        orderBy: { memberId: 'asc' },
        select: {
          memberId: true,
          name: true,
          godname: true,
          role: true,
          avatarUrl: true,
          status: true,
        },
      });
    });
  });

  describe('findShotTargets', () => {
    it('filters shot targets to GUD members ordered by godname', async () => {
      prisma.member.findMany.mockResolvedValueOnce([]);

      await service.findShotTargets();

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { status: 'GUD' },
        orderBy: { godname: 'asc' },
        select: { id: true, name: true, godname: true },
      });
    });
  });

  describe('findNamesByIds', () => {
    it('finds members by their record IDs', async () => {
      prisma.member.findMany.mockResolvedValueOnce([]);

      await service.findNamesByIds(['member-1', 'member-2']);

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['member-1', 'member-2'] } },
        select: { id: true, name: true },
      });
    });

    it('uses an empty in-filter when no IDs are supplied', async () => {
      prisma.member.findMany.mockResolvedValueOnce([]);

      await expect(service.findNamesByIds([])).resolves.toEqual([]);

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
        select: { id: true, name: true },
      });
    });
  });

  describe('findUnlinked', () => {
    it('lists only members without a Keycloak account', async () => {
      prisma.member.findMany.mockResolvedValueOnce([]);

      await service.findUnlinked();

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { keycloakId: null },
        orderBy: { godname: 'asc' },
        select: {
          memberId: true,
          name: true,
          godname: true,
        },
      });
    });
  });

  describe('resolveShotParticipants', () => {
    it('returns the sender and GUD target record IDs', async () => {
      prisma.member.findUnique
        .mockResolvedValueOnce({ id: 'sender-id' })
        .mockResolvedValueOnce({ id: 'target-id', status: 'GUD' });

      await expect(
        service.resolveShotParticipants('target-id', user),
      ).resolves.toEqual({
        fromId: 'sender-id',
        toId: 'target-id',
      });

      expect(prisma.member.findUnique).toHaveBeenNthCalledWith(1, {
        where: { keycloakId: user.keycloakId },
        select: { id: true },
      });
      expect(prisma.member.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: 'target-id' },
        select: { id: true, status: true },
      });
    });

    it('rejects when the caller has no linked member record', async () => {
      prisma.member.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'target-id', status: 'GUD' });

      const error = await captureRpcException(
        service.resolveShotParticipants('target-id', user),
      );

      expect(error.getError()).toEqual({
        code: GrpcStatus.PERMISSION_DENIED,
        details: 'Connect your member account first',
      });
      expect(prisma.member.findUnique).toHaveBeenCalledTimes(2);
    });

    it('rejects when the target member does not exist', async () => {
      prisma.member.findUnique
        .mockResolvedValueOnce({ id: 'sender-id' })
        .mockResolvedValueOnce(null);

      const error = await captureRpcException(
        service.resolveShotParticipants('missing-target', user),
      );

      expect(error.getError()).toEqual({
        code: GrpcStatus.NOT_FOUND,
        details: 'Member not found',
      });
    });

    it('rejects when the target is not a GUD member', async () => {
      prisma.member.findUnique
        .mockResolvedValueOnce({ id: 'sender-id' })
        .mockResolvedValueOnce({ id: 'target-id', status: 'AS' });

      const error = await captureRpcException(
        service.resolveShotParticipants('target-id', user),
      );

      expect(error.getError()).toEqual({
        code: GrpcStatus.INVALID_ARGUMENT,
        details: 'Only GUD members can receive shots',
      });
    });

    it('rejects when the sender targets their own member record', async () => {
      prisma.member.findUnique
        .mockResolvedValueOnce({ id: 'same-member-id' })
        .mockResolvedValueOnce({ id: 'same-member-id', status: 'GUD' });

      const error = await captureRpcException(
        service.resolveShotParticipants('same-member-id', user),
      );

      expect(error.getError()).toEqual({
        code: GrpcStatus.INVALID_ARGUMENT,
        details: 'You cannot give shots to yourself',
      });
    });
  });

  describe('resolveCurrentMember', () => {
    it('returns the member linked to the authenticated Keycloak user', async () => {
      prisma.member.findUnique.mockResolvedValueOnce({ id: 'member-id' });

      await expect(service.resolveCurrentMember(user)).resolves.toEqual({
        id: 'member-id',
      });
      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: { keycloakId: user.keycloakId },
        select: { id: true },
      });
    });

    it('rejects when the authenticated user has no linked member', async () => {
      prisma.member.findUnique.mockResolvedValueOnce(null);

      const error = await captureRpcException(
        service.resolveCurrentMember(user),
      );

      expect(error.getError()).toEqual({
        code: GrpcStatus.PERMISSION_DENIED,
        details: 'Connect your member account first',
      });
    });
  });
});

async function captureRpcException(
  operation: Promise<unknown>,
): Promise<RpcException> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(RpcException);
    return error as RpcException;
  }

  throw new Error('Expected operation to throw an RpcException');
}
