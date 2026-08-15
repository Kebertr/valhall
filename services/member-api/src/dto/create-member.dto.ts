import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MemberStatus } from '../generated/prisma/enums';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Stina Andersson' })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Freja' })
  godname!: string;

  @IsEnum(MemberStatus)
  @ApiProperty({ enum: MemberStatus, example: MemberStatus.GUD })
  status!: MemberStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Kassör', required: false })
  role?: string;
}
