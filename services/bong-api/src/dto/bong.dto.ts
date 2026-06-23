// src/dto/create-shot.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateShotDto {
  @ApiProperty({ example: 'Rasmus' })
  Id!: string;

  @ApiProperty({ example: 2 })
  amount!: number;

  @ApiProperty({ example: 'Kom sent' })
  reason!: string;
}