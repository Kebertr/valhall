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
import { ResolvePenaltyParticipantsDto } from './dto/resolve-penalty-participants.dto';
import { ResolveMemberNamesDto } from './dto/resolve-member-names.dto';
import { MemberLinkService } from './member-link.service';
import { MemberService } from './member.service';
import { CreateMemberDto } from './dto/create-member.dto';

@Controller('members')
@ApiTags('Members')
@ApiBearerAuth('keycloak')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly memberLinkService: MemberLinkService,
  ) {}

  @Post('add-member')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORDFORANDE)
  createMember(@Body() body: CreateMemberDto) {
    return this.memberService.createMember(body);
  }

  @Get('gudar')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.memberService.findAll();
  }

  @Get('penalty-targets')
  @UseGuards(JwtAuthGuard)
  findPenaltyTargets() {
    return this.memberService.findPenaltyTargets();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findCurrentMember(@CurrentUser() user: AuthenticatedUser) {
    return this.memberService.findCurrentProfile(user);
  }

  @Get('unlinked')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORDFORANDE)
  findUnlinked() {
    return this.memberService.findUnlinked();
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

  @Post('penalty-participants')
  @UseGuards(JwtAuthGuard)
  resolvePenaltyParticipants(
    @Body() body: ResolvePenaltyParticipantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memberService.resolvePenaltyParticipants(
      body.targetMemberRecordId,
      user,
    );
  }
}
