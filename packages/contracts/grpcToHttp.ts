import { status as GrpcStatus } from '@grpc/grpc-js';
  
    export function toGrpcError(error: unknown): { code: number; details?: string } {
    if (typeof error !== 'object' || error === null) {
      return { code: 13 };
    }

    const code =
      'code' in error && typeof error.code === 'number' ? error.code : 13;
    const details =
      'details' in error && typeof error.details === 'string'
        ? error.details
        : undefined;

    return details ? { code, details } : { code };
  }

  export function mapGrpcToHttpStatus(grpcCode: number): number {
    const map: Record<number, number> = {
      [GrpcStatus.OK]: 200,
      [GrpcStatus.CANCELLED]: 499,
      [GrpcStatus.UNKNOWN]: 500,
      [GrpcStatus.INVALID_ARGUMENT]: 400,
      [GrpcStatus.DEADLINE_EXCEEDED]: 504,
      [GrpcStatus.NOT_FOUND]: 404,
      [GrpcStatus.ALREADY_EXISTS]: 409,
      [GrpcStatus.PERMISSION_DENIED]: 403,
      [GrpcStatus.RESOURCE_EXHAUSTED]: 429,
      [GrpcStatus.FAILED_PRECONDITION]: 400,
      [GrpcStatus.ABORTED]: 409,
      [GrpcStatus.OUT_OF_RANGE]: 400,
      [GrpcStatus.UNIMPLEMENTED]: 501,
      [GrpcStatus.INTERNAL]: 500,
      [GrpcStatus.UNAVAILABLE]: 503,
      [GrpcStatus.DATA_LOSS]: 500,
      [GrpcStatus.UNAUTHENTICATED]: 401,
    };
    return map[grpcCode] ?? 500;
  }