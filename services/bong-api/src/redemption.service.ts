import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateRedemptionDto } from './dto/redemption.dto';
import { firstValueFrom, Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import * as microservices from '@nestjs/microservices';
import { approveStatus } from './generated/prisma/browser';

type VideoUploadResponse = {
  videoId: string;
  postUrl: string;
  formData: Record<string, string>;
};

type CompletedVideoResponse = {
  videoId: string;
};

interface VideoGrpcService {
  getPostUpload(
    request: {
      filename: string;
      contentType: string;
      sizeBytes: number;
    },
    metadata: Metadata,
  ): Observable<VideoUploadResponse>;

  completeVideoUpload(
    request: {
      videoId: string;
    },
    metadata: Metadata,
  ): Observable<CompletedVideoResponse>;

}

type CurrentMember = {
  id: string;
};

type MemberName = {
  id: string;
  name: string;
};

interface MemberGrpcService {
  resolveCurrentMember(
    request: Record<string, never>,
    metadata: Metadata,
  ): Observable<CurrentMember>;

  resolveMemberNames(
    request: { ids: string[] },
    metadata: Metadata,
  ): Observable<{ members: MemberName[] }>;
}

@Injectable()
export class RedemptionService {
  private memberService!: MemberGrpcService;
  private videoService!: VideoGrpcService;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MEMBER_PACKAGE')
    private readonly memberClient: microservices.ClientGrpc,
    @Inject('VIDEO_PACKAGE')
    private readonly videoClient: microservices.ClientGrpc,
  ) {}

  onModuleInit() {
    this.memberService =
      this.memberClient.getService<MemberGrpcService>('MemberService');

    this.videoService =
      this.videoClient.getService<VideoGrpcService>('VideoService');
  }

  async createRedemption(
    body: CreateRedemptionDto,
    authorization: string,
  ) {
    const metadata = this.createMetadata(authorization);

    const member = await firstValueFrom(
      this.memberService.resolveCurrentMember({}, metadata),
    );

    const upload = await firstValueFrom(
      this.videoService.getPostUpload(
        {
          filename: body.filename,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
        },
        metadata,
      ),
    );

    return this.prisma.$transaction(async (base) => {
      const balance = await base.bongBalance.findUnique({
        where: {
          memberId: member.id,
        },
      });

      if (!balance) {
        throw new ConflictException(
          'Insufficient balance for redemption',
        );
      }

      const available =
        balance.totalAdded -
        balance.totalTaken -
        balance.totalPending;

      if (available < body.bongAmount) {
        throw new ConflictException(
          'Insufficient balance for redemption',
        );
      }

      await base.bongBalance.update({
        where: {
          memberId: member.id,
        },
        data: {
          totalPending: {
            increment: body.bongAmount,
          },
        },
      });

      const redemption = await base.redemption.create({
        data: {
          toId: member.id,
          amount: body.bongAmount,
          videoId: upload.videoId,
          status: approveStatus.PENDING,
        },
      });

      return {
        redemptionId: redemption.id,
        videoId: upload.videoId,
        postUrl: upload.postUrl,
        formData: upload.formData,
      };
    },
    {
      isolationLevel: 'Serializable',
    });
  }

  async completeRedemptionUpload(
    redemptionId: string,
    authorization: string,
  ) {
    const metadata = this.createMetadata(authorization);

    const member = await firstValueFrom(
      this.memberService.resolveCurrentMember({}, metadata),
    );

    const redemption = await this.prisma.redemption.findFirst({
      where: {
        id: redemptionId,
        toId: member.id,
      },
    });

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    await firstValueFrom(
      this.videoService.completeVideoUpload(
        {
          videoId: redemption.videoId,
        },
        metadata,
      ),
    );

    return {
      ok: true,
      redemptionId: redemption.id,
      message: 'Redemption upload completed',
    };
  }

  async recentRedemptions(authorization: string, skip = 0) {
    const metadata = this.createMetadata(authorization);
    const redemptions = await this.prisma.redemption.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: Number.isInteger(skip) && skip > 0 ? skip : 0,
      take: 3,
      select: {
        id: true,
        toId: true,
        amount: true,
        videoId: true,
        status: true,
        createdAt: true,
        acceptedId: true,
      },
    });

    if (redemptions.length === 0) {
      return [];
    }

    const memberIds = [
      ...new Set(redemptions.map((redemption) => redemption.toId)),
    ];
    const { members } = await firstValueFrom(
      this.memberService.resolveMemberNames({ ids: memberIds }, metadata),
    );

    return redemptions.map((redemption) => {
      const receiver = members.find((member) => member.id === redemption.toId);
      const reviewer = members.find((member) => member.id === redemption.acceptedId);

      return {
      id: redemption.id,
      memberName: receiver?.name ?? 'Okänd medlem',
      amount: redemption.amount,
      status: redemption.status,
      createdAt: redemption.createdAt,
      videoId: redemption.videoId,
      acceptedByName: reviewer?.name ?? 'Okänd medlem',
    }});
  }

  private createMetadata(authorization: string) {
    const metadata = new Metadata();
    metadata.set('authorization', authorization);
    return metadata;
  }
}
