import type { Metadata } from "@grpc/grpc-js";
import { Observable } from "rxjs";
export declare const protobufPackage = "video";
export interface VerifyUploadedVideoRequest {
    videoId: string;
}
export interface VerifyUploadedVideoResponse {
    videoId: string;
}
export interface GetPostUploadRequest {
    filename: string;
    contentType: string;
    sizeBytes: number;
}
export interface GetPostUploadResponse {
    videoId: string;
    postUrl: string;
    formData: {
        [key: string]: string;
    };
}
export interface GetPostUploadResponse_FormDataEntry {
    key: string;
    value: string;
}
export interface CompleteVideoUploadRequest {
    videoId: string;
}
export interface CompleteVideoUploadResponse {
    videoId: string;
}
export declare const VIDEO_PACKAGE_NAME = "video";
export interface VideoServiceClient {
    verifyUploadedVideo(request: VerifyUploadedVideoRequest, metadata?: Metadata): Observable<VerifyUploadedVideoResponse>;
    getPostUpload(request: GetPostUploadRequest, metadata?: Metadata): Observable<GetPostUploadResponse>;
    completeVideoUpload(request: CompleteVideoUploadRequest, metadata?: Metadata): Observable<CompleteVideoUploadResponse>;
}
export interface VideoServiceController {
    verifyUploadedVideo(request: VerifyUploadedVideoRequest, metadata?: Metadata): Observable<VerifyUploadedVideoResponse>;
    getPostUpload(request: GetPostUploadRequest, metadata?: Metadata): Observable<GetPostUploadResponse>;
    completeVideoUpload(request: CompleteVideoUploadRequest, metadata?: Metadata): Observable<CompleteVideoUploadResponse>;
}
export declare function VideoServiceControllerMethods(): (constructor: Function) => void;
export declare const VIDEO_SERVICE_NAME = "VideoService";
