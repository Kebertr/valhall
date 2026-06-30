import { IsString, MinLength } from 'class-validator';

export class ConsumeMemberLinkDto {
  @IsString()
  @MinLength(32)
  token!: string;
}
