export declare function toGrpcError(error: unknown): {
    code: number;
    details?: string;
};
export declare function mapGrpcToHttpStatus(grpcCode: number): number;
