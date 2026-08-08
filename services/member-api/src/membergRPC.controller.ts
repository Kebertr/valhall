import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import * as auth from '@valhall/auth';
import { MemberService } from './member.service';
import type { AuthenticatedUser } from '@valhall/auth';

type ResolveMemberNamesRequest = {
  ids: string[];
};

type ResolveShotParticipantsRequest = {
  targetMemberRecordId: string;
};

@Controller()
export class MemberGrpcController {
  constructor(private readonly memberService: MemberService) {}

  @UseGuards(auth.GrpcJwtAuthGuard)
  @GrpcMethod('MemberService', 'ResolveMemberNames')
  async resolveMemberNames(request: ResolveMemberNamesRequest) {
    const members = await this.memberService.findNamesByIds(request.ids);

    return { members };
  }

  @UseGuards(auth.GrpcJwtAuthGuard)
  @GrpcMethod('MemberService', 'ResolveShotParticipants')
  resolveShotParticipants(
    @Payload() request: ResolveShotParticipantsRequest,
    @auth.CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memberService.resolveShotParticipants(
      request.targetMemberRecordId,
      user,
    );
  }

  @UseGuards(auth.GrpcJwtAuthGuard)
  @GrpcMethod('MemberService', 'ResolveCurrentMember')
  resolveCurrentMember(@auth.CurrentUser() user: AuthenticatedUser) {
    return this.memberService.resolveCurrentMember(user);
  }

  @UseGuards(auth.GrpcJwtAuthGuard)
  @GrpcMethod('MemberService', 'ListShotTargets')
  async findShotTargets(@auth.CurrentUser() user: AuthenticatedUser) {
    const members = await this.memberService.findShotTargets();

    return { members };
  }
}
