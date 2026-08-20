import type { Metadata } from "@grpc/grpc-js";
import { Observable } from "rxjs";
export declare const protobufPackage = "member";
export interface ResolveShotParticipantsRequest {
    targetMemberRecordId: string;
}
export interface ResolveShotParticipantsResponse {
    fromId: string;
    toId: string;
}
export interface ResolveMemberNamesRequest {
    ids: string[];
}
export interface MemberName {
    id: string;
    name: string;
}
export interface ResolveMemberNamesResponse {
    members: MemberName[];
}
export interface ResolveCurrentMemberRequest {
}
export interface ResolveCurrentMemberResponse {
    id: string;
}
export interface ListShotTargetsRequest {
}
export interface ShotTarget {
    id: string;
    name: string;
    godname: string;
}
export interface ListShotTargetsResponse {
    members: ShotTarget[];
}
export declare const MEMBER_PACKAGE_NAME = "member";
export interface MemberServiceClient {
    resolveShotParticipants(request: ResolveShotParticipantsRequest, metadata?: Metadata): Observable<ResolveShotParticipantsResponse>;
    resolveMemberNames(request: ResolveMemberNamesRequest, metadata?: Metadata): Observable<ResolveMemberNamesResponse>;
    resolveCurrentMember(request: ResolveCurrentMemberRequest, metadata?: Metadata): Observable<ResolveCurrentMemberResponse>;
    listShotTargets(request: ListShotTargetsRequest, metadata?: Metadata): Observable<ListShotTargetsResponse>;
}
export interface MemberServiceController {
    resolveShotParticipants(request: ResolveShotParticipantsRequest, metadata?: Metadata): Observable<ResolveShotParticipantsResponse>;
    resolveMemberNames(request: ResolveMemberNamesRequest, metadata?: Metadata): Observable<ResolveMemberNamesResponse>;
    resolveCurrentMember(request: ResolveCurrentMemberRequest, metadata?: Metadata): Observable<ResolveCurrentMemberResponse>;
    listShotTargets(request: ListShotTargetsRequest, metadata?: Metadata): Observable<ListShotTargetsResponse>;
}
export declare function MemberServiceControllerMethods(): (constructor: Function) => void;
export declare const MEMBER_SERVICE_NAME = "MemberService";
