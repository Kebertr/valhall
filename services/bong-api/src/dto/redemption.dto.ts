import { ApiProperty } from '@nestjs/swagger';

export class CreateRedemptionDto {
  @ApiProperty({ example: 2, minimum: 1 })
  amount!: number;
}
