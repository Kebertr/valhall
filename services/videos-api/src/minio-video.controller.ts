import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MinioVideoService } from './minio-video.service';
import { JwtAuthGuard } from '@valhall/auth';
import {
  CreateVideoUploadDto,
  GetVideoUrlsDto,
  GetVideoUrlsResponseDto,
  VideoUploadCompleteDto,
} from './dto/videos.dto';

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

  @Post('get-Urls')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Playback URLs for the requested videos',
    type: GetVideoUrlsResponseDto,
  })
  getVideosUrls(@Body() body: GetVideoUrlsDto) {
    return this.service.getVideoUrls(body.ids);
  }
}
