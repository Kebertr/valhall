import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum BongAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ModerateBongDto {
  @IsEnum(BongAction)
  @ApiProperty({ enum: BongAction })
  action!: BongAction;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 2, minimum: 1, required: false })
  amount?: number;
}
