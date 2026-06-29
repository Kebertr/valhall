import { Controller, Get, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  
  @Get('gudar')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.memberService.findAll();
  }
}
