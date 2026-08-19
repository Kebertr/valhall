import { Injectable } from '@nestjs/common';
import {
    Counter,
    Gauge,
    Histogram,
} from 'prom-client';
import { PrometheusService } from './prometheus.service';

@Injectable()
export class GrpcMetricsService {
    readonly started: Counter<'grpc_service' | 'grpc_method'>;
    readonly handled: Counter<
        'grpc_service' | 'grpc_method' | 'grpc_code'
    >;
    readonly duration: Histogram<'grpc_service' | 'grpc_method'>;
    readonly inFlight: Gauge<'grpc_service' | 'grpc_method'>;

    constructor(prometheus: PrometheusService) {
        this.started = new Counter({
            name: 'grpc_server_started_total',
            help: 'Total number of gRPC calls started',
            labelNames: ['grpc_service', 'grpc_method'],
            registers: [prometheus.register],
        });

        this.handled = new Counter({
            name: 'grpc_server_handled_total',
            help: 'Total number of completed gRPC calls',
            labelNames: ['grpc_service', 'grpc_method', 'grpc_code'],
            registers: [prometheus.register],
        });

        this.duration = new Histogram({
            name: 'grpc_server_handling_seconds',
            help: 'Time spent handling gRPC calls',
            labelNames: ['grpc_service', 'grpc_method'],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [prometheus.register],
        });

        this.inFlight = new Gauge({
            name: 'grpc_server_in_flight',
            help: 'Number of gRPC calls currently being handled',
            labelNames: ['grpc_service', 'grpc_method'],
            registers: [prometheus.register],
        });
    }
}