import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePenaltyDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    description: 'UUID of the GUD receiving the penalty',
  })
  @IsUUID()
  Id!: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 2, minimum: 1 })
  amount!: number;

  @ApiProperty({ example: 'Kom sent' })
  @IsString()
  reason!: string;
}
