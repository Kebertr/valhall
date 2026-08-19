import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import * as auth from '@valhall/auth';
import { MemberService } from './member.service';
import type { AuthenticatedUser } from '@valhall/auth';
import { GrpcMetricsInterceptor } from './grpc-metrics.interceptor';

type ResolveMemberNamesRequest = {
  ids: string[];
};

type ResolveShotParticipantsRequest = {
  targetMemberRecordId: string;
};

@Controller()
@UseGuards(auth.GrpcJwtAuthGuard)
@UseInterceptors(GrpcMetricsInterceptor)
export class MemberGrpcController {
  constructor(private readonly memberService: MemberService) {}

  @GrpcMethod('MemberService', 'ResolveMemberNames')
  async resolveMemberNames(request: ResolveMemberNamesRequest) {
    const members = await this.memberService.findNamesByIds(request.ids);

    return { members };
  }

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

  @GrpcMethod('MemberService', 'ResolveCurrentMember')
  resolveCurrentMember(@auth.CurrentUser() user: AuthenticatedUser) {
    return this.memberService.resolveCurrentMember(user);
  }
  
  @GrpcMethod('MemberService', 'ListShotTargets')
  async findShotTargets() {
    const members = await this.memberService.findShotTargets();

    return { members };
  }
}
