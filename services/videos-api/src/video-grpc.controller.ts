import { Controller, UseGuards } from '@nestjs/common';
import { Metadata, status } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { GrpcJwtAuthGuard } from '@valhall/auth';
import { MinioVideoService } from './minio-video.service';

type GetPostUploadRequest = {
  filename: string;
  contentType: string;
  sizeBytes: number | string;
};

type VideoIdRequest = {
  videoId: string;
};

@Controller()
@UseGuards(GrpcJwtAuthGuard)
export class VideoGrpcController {
  constructor(
    private readonly videoService: MinioVideoService,
  ) {}

  @GrpcMethod('VideoService', 'GetPostUpload')
  async getPostUpload(
    request: GetPostUploadRequest,
    metadata: Metadata,
  ) {
    const authorization = this.getAuthorization(metadata);

    const upload = await this.videoService.createUploadPost(
      request.filename,
      request.contentType,
      Number(request.sizeBytes),
      authorization,
    );

    return {
      videoId: upload.videoId,
      postUrl: upload.postURL,
      formData: upload.formData,
    };
  }

  @GrpcMethod('VideoService', 'CompleteVideoUpload')
  async completeVideoUpload(
    request: VideoIdRequest,
    metadata: Metadata,
  ) {
    const authorization = this.getAuthorization(metadata);

    const video = await this.videoService.completeUpload(
      request.videoId,
      authorization,
    );

    return {
      videoId: video.id,
    };
  }

  @GrpcMethod('VideoService', 'VerifyUploadedVideo')
  async verifyUploadedVideo(
    request: VideoIdRequest,
    metadata: Metadata,
  ) {
    const authorization = this.getAuthorization(metadata);

    return this.videoService.verifyUploadedVideo(
      request.videoId,
      authorization,
    );
  }

  @GrpcMethod('VideoService', 'GetVideoPlaybackUrl')
  async getVideoPlaybackUrl(
    request: VideoIdRequest,
    metadata: Metadata,
  ) {
    this.getAuthorization(metadata);

    try {
      return await this.videoService.getVideoPlaybackUrl(request.videoId);
    } catch {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Uploaded video not found',
      });
    }
  }

  private getAuthorization(metadata: Metadata): string {
    const authorization =
      metadata.get('authorization')[0]?.toString();

    if (!authorization) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Authorization metadata is required',
      });
    }

    return authorization;
  }
}
