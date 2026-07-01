import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConsumeMemberLinkDto {
  @ApiProperty({ description: 'Raw token from the member invitation URL' })
  @IsString()
  @MinLength(32)
  token!: string;
}
