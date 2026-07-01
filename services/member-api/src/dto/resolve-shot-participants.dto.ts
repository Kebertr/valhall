import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveShotParticipantsDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  targetMemberRecordId!: string;
}
