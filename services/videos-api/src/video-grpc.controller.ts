import { Controller } from '@nestjs/common';
import { Metadata, status } from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { MinioVideoService } from './minio-video.service';

type VerifyUploadedVideoRequest = {
  videoId: string;
};

@Controller()
export class VideoGrpcController {
  constructor(private readonly videoService: MinioVideoService) {}

  @GrpcMethod('VideoService', 'VerifyUploadedVideo')
  async verifyUploadedVideo(
    request: VerifyUploadedVideoRequest,
    metadata: Metadata,
  ) {
    const authorization = metadata.get('authorization')[0]?.toString();

    if (!authorization) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Authorization metadata is required',
      });
    }

    try {
      return await this.videoService.verifyUploadedVideo(
        request.videoId,
        authorization,
      );
    } catch {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Uploaded video not found',
      });
    }
  }
}
