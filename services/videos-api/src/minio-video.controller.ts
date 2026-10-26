import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MinioVideoService } from './minio-video.service';
import { JwtAuthGuard } from '@valhall/auth';
import { CreateVideoUploadDto, VideoUploadCompleteDto } from './dto/videos.dto';

@ApiTags('Videos')
@ApiBearerAuth('keycloak')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class MinioVideoController {
  constructor(private readonly service: MinioVideoService) {}

  @Get('file-url/:name')
  getFile(@Param('name') name: string) {
    return this.service.getFile(name);
  }

  @Get(':videoId/playback-url')
  getVideoPlaybackUrl(@Param('videoId') videoId: string) {
    return this.service.getVideoPlaybackUrl(videoId);
  }

  @Post('complete')
  completeUpload(
    @Body() body: VideoUploadCompleteDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.service.completeUpload(body.videoId, authorization);
  }

  @Post('upload-url')
  createUploadUrl(
    @Body() body: CreateVideoUploadDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.service.createUploadPost(
      body.filename,
      body.contentType,
      body.sizeBytes,
      authorization,
    );
  }
}
