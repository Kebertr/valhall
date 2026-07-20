import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, type Observable } from 'rxjs';
import { approveStatus } from './generated/prisma/client';
import { PrismaService } from './prisma.service';
import { BongAction, type ModerateBongDto } from './dto/moderate-bong.dto';

type CurrentMember = { id: string };

interface MemberGrpcService {
  resolveCurrentMember(
    request: Record<string, never>,
    metadata: Metadata,
  ): Observable<CurrentMember>;
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

  async moderate(id: string, body: ModerateBongDto, authorization: string) {
    const bong = await this.prisma.add.findUnique({ where: { id } });

    if (!bong) {
      throw new NotFoundException('Bongen hittades inte');
    }

    if (bong.status !== approveStatus.PENDING) {
      throw new BadRequestException('Bongen har redan hanterats');
    }

    const approved = body.action === BongAction.APPROVE;
    const reviewer = await this.resolveCurrentMember(authorization);

    return this.prisma.add.update({
      where: { id },
      data: {
        status: approved ? approveStatus.APPROVED : approveStatus.DENIED,
        acceptedId: reviewer.id,
        ...(approved && body.amount !== undefined
          ? { amount: body.amount }
          : {}),
      },
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
