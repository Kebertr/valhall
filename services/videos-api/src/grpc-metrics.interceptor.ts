import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import {
  catchError,
  finalize,
  Observable,
  throwError,
} from 'rxjs';
import { GrpcMetricsService } from './grpc-metrics.service';

@Injectable()
export class GrpcMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: GrpcMetricsService) { }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'rpc') {
      return next.handle();
    }

    const labels = {
      grpc_service: context.getClass().name,
      grpc_method: context.getHandler().name,
    };

    this.metrics.started.inc(labels);
    this.metrics.inFlight.inc(labels);

    const stopTimer = this.metrics.duration.startTimer(labels);
    let grpcCode = 'OK';

    return next.handle().pipe(
      catchError((error: unknown) => {
        grpcCode = this.getGrpcCode(error);
        return throwError(() => error);
      }),
      finalize(() => {
        stopTimer();

        this.metrics.inFlight.dec(labels);

        this.metrics.handled.inc({
          ...labels,
          grpc_code: grpcCode,
        });
      }),
    );
  }

  private getGrpcCode(error: unknown): string {
    let value = error;

    if (error instanceof RpcException) {
      value = error.getError();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'code' in value &&
      typeof value.code === 'number'
    ) {
      return status[value.code] ?? String(value.code);
    }

    return 'UNKNOWN';
  }
}