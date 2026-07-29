import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MinioVideoService } from './minio-video.service';

@Controller('files')
export class MinioVideoController {
  constructor(private readonly service: MinioVideoService) {}

  @Get('buckets')
  bucketsList() {
    return this.service.bucketsList();
  }

  @Get('file-url/:name')
  getFile(@Param('name') name: string) {
    return this.service.getFile(name);
  }

  @Post('upload-url')
  createUploadUrl(
    @Body('filename') filename: string,
    @Body('contentType') contentType: string,
  ) {
    return this.service.createUploadPost(filename, contentType);
  }
}
