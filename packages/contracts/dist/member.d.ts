import type { Metadata } from "@grpc/grpc-js";
import { Observable } from "rxjs";
export declare const protobufPackage = "member";
export interface ResolvePenaltyParticipantsRequest {
    targetMemberRecordId: string;
}
export interface ResolvePenaltyParticipantsResponse {
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
export interface ListPenaltyTargetsRequest {
}
export interface PenaltyTarget {
    id: string;
    name: string;
    godname: string;
}
export interface ListPenaltyTargetsResponse {
    members: PenaltyTarget[];
}
export declare const MEMBER_PACKAGE_NAME = "member";
export interface MemberServiceClient {
    resolvePenaltyParticipants(request: ResolvePenaltyParticipantsRequest, metadata?: Metadata): Observable<ResolvePenaltyParticipantsResponse>;
    resolveMemberNames(request: ResolveMemberNamesRequest, metadata?: Metadata): Observable<ResolveMemberNamesResponse>;
    resolveCurrentMember(request: ResolveCurrentMemberRequest, metadata?: Metadata): Observable<ResolveCurrentMemberResponse>;
    listPenaltyTargets(request: ListPenaltyTargetsRequest, metadata?: Metadata): Observable<ListPenaltyTargetsResponse>;
}
export interface MemberServiceController {
    resolvePenaltyParticipants(request: ResolvePenaltyParticipantsRequest, metadata?: Metadata): Observable<ResolvePenaltyParticipantsResponse>;
    resolveMemberNames(request: ResolveMemberNamesRequest, metadata?: Metadata): Observable<ResolveMemberNamesResponse>;
    resolveCurrentMember(request: ResolveCurrentMemberRequest, metadata?: Metadata): Observable<ResolveCurrentMemberResponse>;
    listPenaltyTargets(request: ListPenaltyTargetsRequest, metadata?: Metadata): Observable<ListPenaltyTargetsResponse>;
}
export declare function MemberServiceControllerMethods(): (constructor: Function) => void;
export declare const MEMBER_SERVICE_NAME = "MemberService";
