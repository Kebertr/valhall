import { IsInt, IsNotEmpty, IsString, IsUUID, Matches, Max, Min, MinLength, isNotEmpty} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const MAXIMUM_VIDEO_SIZE = 1024 * 1024 * 1024;
export class CreateVideoUploadDto {
  @ApiProperty({ 
    description: 'Filename of the video',
    example: 'my-video.mp4',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    description: 'MIME type reported by the browser',
    example: 'video/quicktime',
  })
  @IsString()
  @Matches(/^video\/[a-zA-Z0-9.+-]+$/, {
    message: 'contentType must be a video MIME type',
  })
  contentType!: string;

  @ApiProperty({
    description: 'Video size in bytes',
    example: 2653588,
    minimum: 1,
    maximum: MAXIMUM_VIDEO_SIZE,
  })
  @IsInt()
  @Min(1)
  @Max(MAXIMUM_VIDEO_SIZE)
  sizeBytes!: number;
}

export class VideoUploadCompleteDto {
  @ApiProperty({
    description: 'The ID of the video that was uploaded',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  videoId!: string;
}

