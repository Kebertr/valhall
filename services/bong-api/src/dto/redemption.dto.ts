import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateRedemptionDto {
  @ApiProperty({
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  bongAmount!: number;

  @ApiProperty({
    example: 'test.mp4',
  })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    example: 'video/mp4',
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiProperty({
    example: 10485760,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
