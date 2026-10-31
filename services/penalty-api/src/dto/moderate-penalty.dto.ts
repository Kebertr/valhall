import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum PenaltyAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ModeratePenaltyDto {
  @IsEnum(PenaltyAction)
  @ApiProperty({ enum: PenaltyAction })
  action!: PenaltyAction;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 2, minimum: 1, required: false })
  amount?: number;
}

export class changeAmountDto {
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 2, minimum: 0 })
  amount!: number;
}
