import {
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';
import * as clientGrpcInterface from '@nestjs/microservices/interfaces/client-grpc.interface';

type MemberName = {
  id: string;
  name: string;
};

type LeaderboardType = 'add' | 'redeem';

interface MemberGrpcService {
  resolveMemberNames(
    data: { ids: string[] },
    metadata: Metadata,
  ): Observable<{ members: MemberName[] }>;
}
type LeaderboardRow =
  | {
      memberId: string;
      totalAdded: number;
    }
  | {
      memberId: string;
      totalTaken: number;
    };

@Injectable()
export class LeaderboardService {
  private memberService!: MemberGrpcService;
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MEMBER_PACKAGE')
    private readonly memberClient: clientGrpcInterface.ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.memberClient.getService<MemberGrpcService>('MemberService');
  }

  async getLeaderboard(authorization: string, type: LeaderboardType) {
    if (!authorization) {
      throw new UnauthorizedException({
        message: 'Authorization header is missing',
      });
    }
    const members = (await this.prisma.bongBalance.findMany({
      orderBy: type === 'add' ? { totalAdded: 'desc' } : { totalTaken: 'desc' },
      take: 20,
      select:
        type === 'add'
          ? {
              memberId: true,
              totalAdded: true,
            }
          : {
              memberId: true,
              totalTaken: true,
            },
    })) as LeaderboardRow[];

    const memberIds = members.map((member) => member.memberId);

    const memberNames = await this.resolveMemberNames(memberIds, authorization);

    const names = new Map(
      memberNames.map((member) => [member.id, member.name]),
    );

    return members.map((member) => {
      return {
        name: names.get(member.memberId) || 'Unknown',
        amount: 'totalAdded' in member ? member.totalAdded : member.totalTaken,
      };
    });
  }

  private async resolveMemberNames(
    ids: string[],
    authorization: string,
  ): Promise<MemberName[]> {
    try {
      const response = await firstValueFrom(
        this.memberService.resolveMemberNames(
          { ids },
          this.buildMetadata(authorization),
        ),
      );
      return response.members;
    } catch (error: unknown) {
      const grpcError = this.toGrpcError(error);
      throw new HttpException(
        'Could not load recent activity',
        this.mapGrpcToHttpStatus(grpcError.code),
      );
    }
  }

  private toGrpcError(error: unknown): { code: number; details?: string } {
    if (typeof error !== 'object' || error === null) {
      return { code: 13 };
    }

    const code =
      'code' in error && typeof error.code === 'number' ? error.code : 13;
    const details =
      'details' in error && typeof error.details === 'string'
        ? error.details
        : undefined;

    return details ? { code, details } : { code };
  }

  private mapGrpcToHttpStatus(grpcCode: number): number {
    const map: Record<number, number> = {
      3: 400,
      5: 404,
      7: 403,
      16: 401,
    };
    return map[grpcCode] ?? 500;
  }

  private buildMetadata(authorization: string): Metadata {
    const metadata = new Metadata();
    metadata.add('authorization', authorization);
    return metadata;
  }
}
