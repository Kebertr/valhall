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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConsumeMemberLinkDto } from './dto/consume-member-link.dto';
import { ResolveShotParticipantsDto } from './dto/resolve-shot-participants.dto';
import { ResolveMemberNamesDto } from './dto/resolve-member-names.dto';
import { MemberLinkService } from './member-link.service';
import { MemberService } from './member.service';

@Controller('members')
@ApiTags('Members')
@ApiBearerAuth('keycloak')
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

  @Get('shot-targets')
  @UseGuards(JwtAuthGuard)
  findShotTargets() {
    return this.memberService.findShotTargets();
  }

  @Post('resolve-names')
  @UseGuards(JwtAuthGuard)
  resolveNames(@Body() body: ResolveMemberNamesDto) {
    return this.memberService.findNamesByIds(body.ids);
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

  @Post('shot-participants')
  @UseGuards(JwtAuthGuard)
  resolveShotParticipants(
    @Body() body: ResolveShotParticipantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memberService.resolveShotParticipants(
      body.targetMemberRecordId,
      user,
    );
  }
}
