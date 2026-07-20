// src/dto/create-shot.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateShotDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    description: 'UUID of the GUD receiving the shot',
  })
  Id!: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 2, minimum: 1 })
  amount!: number;

  @ApiProperty({ example: 'Kom sent' })
  reason!: string;
}
