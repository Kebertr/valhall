import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, type Observable } from 'rxjs';
import { approveStatus } from './generated/prisma/client';
import { PrismaService } from './prisma.service';
import {
  PenaltyAction,
  type ModeratePenaltyDto,
} from './dto/moderate-penalty.dto';

type CurrentMember = { id: string };

interface MemberGrpcService {
  resolveCurrentMember(
    request: Record<string, never>,
    metadata: Metadata,
  ): Observable<CurrentMember>;

  ListPenaltyTargets(
    request: Record<string, never>,
    metadata: Metadata,
  ): Observable<{ members: { id: string; name: string; godname: string }[] }>;
}

@Injectable()
export class BongmeisterService {
  private memberService!: MemberGrpcService;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MEMBER_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.client.getService<MemberGrpcService>('MemberService');
  }

  async moderate(id: string, body: ModeratePenaltyDto, authorization: string) {
    const penalty = await this.prisma.add.findUnique({ where: { id } });

    if (!penalty) {
      throw new NotFoundException('Penaltyen hittades inte');
    }

    if (penalty.status !== approveStatus.PENDING) {
      throw new BadRequestException('Penaltyen har redan hanterats');
    }

    const approved = body.action === PenaltyAction.APPROVE;
    const reviewer = await this.resolveCurrentMember(authorization);

    await this.prisma.$transaction(async (base) => {
      const finalAmount = body.amount ?? penalty.amount;

      await base.add.update({
        where: { id },
        data: {
          status: approved ? approveStatus.APPROVED : approveStatus.DENIED,
          acceptedId: reviewer.id,
          amount: finalAmount,
        },
      });

      if (approved) {
        await base.bongBalance.upsert({
          where: { memberId: penalty.toId },
          create: { memberId: penalty.toId, totalAdded: finalAmount },
          update: {
            totalAdded: { increment: finalAmount },
            currentAmount: { increment: finalAmount },
          },
        });
      }
      return {
        id: penalty.id,
        toId: penalty.toId,
        fromId: penalty.fromId,
        amount: penalty.amount,
        status: approved ? approveStatus.APPROVED : approveStatus.DENIED,
        acceptedId: reviewer.id,
      };
    });
  }

  async moderateRedeem(
    id: string,
    body: ModeratePenaltyDto,
    authorization: string,
  ) {
    const penalty = await this.prisma.redemption.findUnique({ where: { id } });

    if (!penalty) {
      throw new NotFoundException('Penaltyen hittades inte');
    }

    if (penalty.status !== approveStatus.PENDING) {
      throw new BadRequestException('Penaltyen har redan hanterats');
    }

    const approved = body.action === PenaltyAction.APPROVE;
    const reviewer = await this.resolveCurrentMember(authorization);

    return this.prisma.$transaction(
      async (base) => {
        const redemption = await base.redemption.findUnique({
          where: { id },
        });

        if (!redemption) {
          throw new NotFoundException('Den hittades inte');
        }

        if (redemption.status !== approveStatus.PENDING) {
          throw new BadRequestException('Already redeemed');
        }

        const balance = await base.bongBalance.findUnique({
          where: {
            memberId: redemption.toId,
          },
        });

        if (!balance) {
          throw new ConflictException(
            'Du måste lägga till personens penaltyar innan',
          );
        }

        //Final amount is number of penalties that is being taken
        const finalAmount = body.amount ?? redemption.amount;

        //Additional amounts is number of penalties that are changed by bongmeister
        const additionalAmount = finalAmount - redemption.amount;

        //Chekc so the balance can't be negative
        const availableForThisRedemption =
          balance.currentAmount - (balance.totalPending - redemption.amount);

        if (approved && finalAmount > availableForThisRedemption) {
          throw new ConflictException('För lite saldo');
        }
        const available = balance.currentAmount - balance.totalPending;

        if (approved && additionalAmount > 0 && available < additionalAmount) {
          throw new ConflictException('För lite saldo');
        }
        const statusUpdate = await base.redemption.updateMany({
          where: {
            id,
            status: approveStatus.PENDING,
          },
          data: {
            status: approved ? approveStatus.APPROVED : approveStatus.DENIED,
            acceptedId: reviewer.id,
            amount: finalAmount,
            reviewedAt: new Date(),
          },
        });

        if (statusUpdate.count !== 1) {
          throw new BadRequestException('Already redeemed');
        }

        if (approved) {
          await base.bongBalance.update({
            where: {
              memberId: redemption.toId,
            },
            data: {
              totalPending: {
                decrement: redemption.amount,
              },
              totalTaken: {
                increment: finalAmount,
              },
              currentAmount: {
                decrement: finalAmount,
              },
            },
          });
        } else {
          await base.bongBalance.update({
            where: {
              memberId: redemption.toId,
            },
            data: {
              totalPending: {
                decrement: redemption.amount,
              },
            },
          });
        }

        return base.redemption.findUniqueOrThrow({
          where: { id },
        });
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async getPenaltyTargets(authorization: string) {
    const metadata = new Metadata();
    metadata.add('authorization', authorization);

    const { members } = await firstValueFrom(
      this.memberService.ListPenaltyTargets({}, metadata),
    );

    const result: {
      id: string;
      name: string;
      godname: string;
      amount: number;
    }[] = [];

    for (const member of members) {
      const balance = await this.prisma.bongBalance.findUnique({
        where: {
          memberId: member.id,
        },
      });

      result.push({
        ...member,
        amount: balance ? balance.currentAmount : 0,
        godname: member.godname ?? '',
      });
    }

    return result;
  }

  async changeAmount(id: string, amount: number) {
    await this.prisma.bongBalance.upsert({
      where: { memberId: id },
      create: { memberId: id, currentAmount: amount },
      update: { currentAmount: amount },
    });
  }

  private async resolveCurrentMember(authorization: string) {
    const metadata = new Metadata();
    metadata.add('authorization', authorization);

    return firstValueFrom(
      this.memberService.resolveCurrentMember({}, metadata),
    );
  }
}
