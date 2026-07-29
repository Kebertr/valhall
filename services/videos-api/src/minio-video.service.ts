import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';
import { MINIO_TOKEN } from './minio.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioVideoService {
  private readonly bucketName: string;

  constructor(
    @Inject(MINIO_TOKEN) private readonly minioService: Minio.Client,
    configService: ConfigService,
  ) {
    this.bucketName =
      configService.getOrThrow<string>('MINIO_VIDEO_BUCKET');
  }

  async bucketsList() {
    return await this.minioService.listBuckets();
  }

  async getFile(filename: string) {
    return await this.minioService.presignedUrl(
      'GET',
      this.bucketName,
      filename,
    );
  }

  async createUploadPost(originalFilename: string, contentType: string) {
    if (!originalFilename || typeof originalFilename !== 'string') {
      throw new BadRequestException('filename is required');
    }

    if (!contentType || !contentType.startsWith('video/')) {
      throw new BadRequestException('contentType must be a video type');
    }

    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectName = `${randomUUID()}-${safeFilename}`;
    const expiresInSeconds = 15 * 60;
    const maximumFileSize = 1024 * 1024 * 1024;

    const policy = new Minio.PostPolicy();
    policy.setBucket(this.bucketName);
    policy.setKey(objectName);
    policy.setContentType(contentType);
    policy.setContentLengthRange(1, maximumFileSize);
    policy.setExpires(new Date(Date.now() + expiresInSeconds * 1000));

    const { postURL, formData } =
      await this.minioService.presignedPostPolicy(policy);

    return {
      objectName,
      postURL,
      formData,
      expiresInSeconds,
      maximumFileSize,
    };
  }
}
