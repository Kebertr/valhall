"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGrpcError = toGrpcError;
exports.mapGrpcToHttpStatus = mapGrpcToHttpStatus;
const grpc_js_1 = require("@grpc/grpc-js");
function toGrpcError(error) {
    if (typeof error !== 'object' || error === null) {
        return { code: 13 };
    }
    const code = 'code' in error && typeof error.code === 'number' ? error.code : 13;
    const details = 'details' in error && typeof error.details === 'string'
        ? error.details
        : undefined;
    return details ? { code, details } : { code };
}
function mapGrpcToHttpStatus(grpcCode) {
    const map = {
        [grpc_js_1.status.OK]: 200,
        [grpc_js_1.status.CANCELLED]: 499,
        [grpc_js_1.status.UNKNOWN]: 500,
        [grpc_js_1.status.INVALID_ARGUMENT]: 400,
        [grpc_js_1.status.DEADLINE_EXCEEDED]: 504,
        [grpc_js_1.status.NOT_FOUND]: 404,
        [grpc_js_1.status.ALREADY_EXISTS]: 409,
        [grpc_js_1.status.PERMISSION_DENIED]: 403,
        [grpc_js_1.status.RESOURCE_EXHAUSTED]: 429,
        [grpc_js_1.status.FAILED_PRECONDITION]: 400,
        [grpc_js_1.status.ABORTED]: 409,
        [grpc_js_1.status.OUT_OF_RANGE]: 400,
        [grpc_js_1.status.UNIMPLEMENTED]: 501,
        [grpc_js_1.status.INTERNAL]: 500,
        [grpc_js_1.status.UNAVAILABLE]: 503,
        [grpc_js_1.status.DATA_LOSS]: 500,
        [grpc_js_1.status.UNAUTHENTICATED]: 401,
    };
    return map[grpcCode] ?? 500;
}
