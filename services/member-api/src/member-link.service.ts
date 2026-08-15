import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '@valhall/auth';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from './prisma.service';

@Injectable()
export class MemberLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createLink(memberId: number) {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.keycloakId) {
      throw new ConflictException('Member is already linked');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.memberAccountLink.upsert({
      where: { memberRecordId: member.id },
      create: {
        memberRecordId: member.id,
        tokenHash: this.hash(token),
        expiresAt,
      },
      update: {
        tokenHash: this.hash(token),
        expiresAt,
        usedAt: null,
      },
    });

    const frontendUrl = this.config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/$/, '');

    return {
      url: `${frontendUrl}/link-member#token=${token}`,
      expiresAt,
    };
  }

  async consumeLink(token: string, user: AuthenticatedUser) {
    const tokenHash = this.hash(token.trim());

    return this.prisma.$transaction(async (transaction) => {
      const link = await transaction.memberAccountLink.findUnique({
        where: { tokenHash },
      });

      if (!link || link.usedAt || link.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Invalid or expired link');
      }

      const accountAlreadyLinked = await transaction.member.findUnique({
        where: { keycloakId: user.keycloakId },
      });

      if (accountAlreadyLinked) {
        throw new ConflictException(
          'This Keycloak account is already linked to a member',
        );
      }

      try {
        await transaction.member.update({
          where: {
            id: link.memberRecordId,
            AND: {
              keycloakId: null,
            },
          },
          data: {
            keycloakId: user.keycloakId,
          },
        });
      } catch (error) {
        if (this.hasPrismaCode(error, 'P2025')) {
          throw new ConflictException('Member is already linked');
        }

        if (this.hasPrismaCode(error, 'P2002')) {
          throw new ConflictException(
            'This Keycloak account is already linked to a member',
          );
        }

        throw error;
      }

      try {
        await transaction.memberAccountLink.update({
          where: {
            id: link.id,
            AND: {
              usedAt: null,
            },
          },
          data: {
            usedAt: new Date(),
          },
        });
      } catch (error) {
        if (this.hasPrismaCode(error, 'P2025')) {
          throw new ConflictException('Link has already been used');
        }

        throw error;
      }

      return transaction.member.findUniqueOrThrow({
        where: { id: link.memberRecordId },
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
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
