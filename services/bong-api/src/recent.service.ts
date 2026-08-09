import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { firstValueFrom, Observable } from "rxjs";
import { Metadata } from "@grpc/grpc-js";
import * as microservices from "@nestjs/microservices";

type MemberName = {
  id: string;
  name: string;
};

interface MemberGrpcService {
  resolveMemberNames(
    request: { ids: string[] },
    metadata: Metadata,
  ): Observable<{ members: MemberName[] }>;
}

type RecentActivity =
  | {
      type: "ADD";
      fromName: string;
      toName: string;
      amount: number;
      reason: string;
      status: string;
      createdAt: Date;
    }
  | {
      type: "REDEMPTION";
      memberName: string;
      amount: number;
      status: string;
      createdAt: Date;
    };
@Injectable()
export class RecentService {
    private memberService!: MemberGrpcService;

    constructor(
        private readonly prisma: PrismaService,
        @Inject("MEMBER_PACKAGE")
        private readonly client: microservices.ClientGrpc,
      ) {}

    onModuleInit() {
        this.memberService =
        this.client.getService<MemberGrpcService>(
            "MemberService",
        );
    }

    async recentActivities(authorization: string) {
        const eight = await this.prisma.$transaction(async (base) => {
            const redemptions = await base.redemption.findMany({
                take: 8,
                orderBy: {
                    createdAt: 'desc',
                },
            })
            const add = await base.add.findMany({
                take: 8,
                orderBy: {
                    createdAt: 'desc',
                },
            });

            const combined = [...add, ...redemptions];

            combined.sort(
            (a, b) =>
                b.createdAt.getTime() - a.createdAt.getTime(),
            );

            return combined.slice(0, 8);
        })

        const memberIds: string[] = [];

    for (const activity of eight) {
      if (!memberIds.includes(activity.toId)) {
        memberIds.push(activity.toId);
      }

      // Only Add records have fromId.
      if (
        "fromId" in activity &&
        !memberIds.includes(activity.fromId)
      ) {
        memberIds.push(activity.fromId);
      }
    }

    const metadata = new Metadata();
    metadata.add("authorization", authorization);

    const response = await firstValueFrom(
      this.memberService.resolveMemberNames(
        { ids: memberIds },
        metadata,
      ),
    );

    const result: RecentActivity[] = [];

    for (const activity of eight) {
      const receiver = response.members.find(
        (member) => member.id === activity.toId,
      );

      if ("fromId" in activity) {
        const sender = response.members.find(
          (member) => member.id === activity.fromId,
        );

        result.push({
          type: "ADD",
          fromName: sender?.name ?? "Okänd medlem",
          toName: receiver?.name ?? "Okänd medlem",
          amount: activity.amount,
          reason: activity.reason,
          status: activity.status,
          createdAt: activity.createdAt,
        });
      } else {
        result.push({
          type: "REDEMPTION",
          memberName: receiver?.name ?? "Okänd medlem",
          amount: activity.amount,
          status: activity.status,
          createdAt: activity.createdAt,
        });
      }
    }

    return result;
    }
}