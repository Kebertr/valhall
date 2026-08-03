import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Metadata } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import * as Minio from 'minio';
import { firstValueFrom, type Observable } from 'rxjs';
import { MINIO_TOKEN } from './minio.constants';
import { PrismaService } from './prisma.service';

type CurrentMember = { id: string };

interface MemberGrpcService {
  resolveCurrentMember(
    request: Record<string, never>,
    metadata: Metadata,
  ): Observable<CurrentMember>;
}

@Injectable()
export class MinioVideoService {
  private readonly bucketName: string;
  private memberService!: MemberGrpcService;

  constructor(
    @Inject(MINIO_TOKEN) private readonly minioService: Minio.Client,
    @Inject('MEMBER_PACKAGE') private readonly client: ClientGrpc,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucketName =
      this.configService.getOrThrow<string>('MINIO_VIDEO_BUCKET');
  }

  onModuleInit() {
    this.memberService =
      this.client.getService<MemberGrpcService>('MemberService');
  }

  async getFile(filename: string) {
    return this.minioService.presignedUrl(
      'GET',
      this.bucketName,
      filename,
      15 * 60,
    );
  }

  async createUploadPost(
    originalFilename: string,
    contentType: string,
    declaredSizeBytes: number,
    authorization: string,
  ) {
    const maximumFileSize = 1024 * 1024 * 1024;

    if (!originalFilename || typeof originalFilename !== 'string') {
      throw new BadRequestException('filename is required');
    }

    if (!contentType || !contentType.startsWith('video/')) {
      throw new BadRequestException('contentType must be a video type');
    }

    if (
      !Number.isSafeInteger(declaredSizeBytes) ||
      declaredSizeBytes < 1 ||
      declaredSizeBytes > maximumFileSize
    ) {
      throw new BadRequestException(
        `sizeBytes must be between 1 and ${maximumFileSize}`,
      );
    }

    if (!authorization?.startsWith('Bearer ')) {
      throw new BadRequestException('authorization header is required');
    }

    const member = await this.resolveCurrentMember(authorization);
    const memberId = member.id;
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const videoId = randomUUID();
    const objectName = `${memberId}/${videoId}-${safeFilename}`;
    const expiresInSeconds = 15 * 60;
    const uploadExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const policy = new Minio.PostPolicy();
    policy.setBucket(this.bucketName);
    policy.setKey(objectName);
    policy.setContentType(contentType);
    policy.setContentLengthRange(declaredSizeBytes, declaredSizeBytes);
    policy.setExpires(uploadExpiresAt);

    const { postURL, formData } =
      await this.minioService.presignedPostPolicy(policy);

    const video = await this.prisma.video.create({
      data: {
        id: videoId,
        memberId,
        bucket: this.bucketName,
        objectKey: objectName,
        originalFilename: safeFilename,
        contentType,
        sizeBytes: BigInt(declaredSizeBytes),
        uploadExpiresAt,
      },
      select: {
        id: true,
      },
    });

    return {
      videoId: video.id,
      objectName,
      postURL,
      formData,
      expiresInSeconds,
      maximumFileSize,
    };
  }

  private async resolveCurrentMember(authorization: string) {
    const metadata = new Metadata();
    metadata.add('authorization', authorization);

    return firstValueFrom(
      this.memberService.resolveCurrentMember({}, metadata),
    );
  }

  async verifyUploadedVideo(videoId: string, authorization: string) {
    const member = await this.resolveCurrentMember(authorization);

    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        memberId: member.id,
        status: 'UPLOADED',
      },
      select: {
        id: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Uploaded video not found');
    }

    return {
      videoId: video.id,
    };
  }

  async completeUpload(videoId: string, authorization: string) {
    if (!videoId || typeof videoId !== 'string') {
      throw new BadRequestException('videoId is required');
    }

    if (!authorization?.startsWith('Bearer ')) {
      throw new BadRequestException('authorization header is required');
    }

    const member = await this.resolveCurrentMember(authorization);

    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        memberId: member.id,
      },
    });

    if (!video) {
      throw new BadRequestException('Video not found');
    }

    if (video.status !== 'UPLOAD_PENDING') {
      throw new BadRequestException(
        `Video is not in UPLOADING state, current state: ${video.status}`,
      );
    }

    const object = await this.minioService.statObject(
      video.bucket,
      video.objectKey,
    );

    if (object.size <= 0) {
      throw new BadRequestException('Uploaded video is empty');
    }

    if (BigInt(object.size) !== video.sizeBytes) {
      throw new BadRequestException('Uploaded video has an unexpected size');
    }

    return this.prisma.video.update({
      where: {
        id: video.id,
      },
      data: {
        status: 'UPLOADED',
      },
      select: {
        id: true,
        status: true,
      },
    });
  }
}
