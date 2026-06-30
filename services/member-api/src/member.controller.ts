import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@valhall/auth';
import type { AuthenticatedUser } from '@valhall/auth';
import { ConsumeMemberLinkDto } from './dto/consume-member-link.dto';
import { MemberLinkService } from './member-link.service';
import { MemberService } from './member.service';

@Controller('members')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly memberLinkService: MemberLinkService,
  ) {}

  @Get('gudar')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.memberService.findAll();
  }

  @Post(':memberId/link-invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORDFORANDE)
  createLink(@Param('memberId', ParseIntPipe) memberId: number) {
    return this.memberLinkService.createLink(memberId);
  }

  @Post('link')
  @UseGuards(JwtAuthGuard)
  consumeLink(
    @Body() body: ConsumeMemberLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memberLinkService.consumeLink(body.token, user);
  }
}
