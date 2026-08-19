import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class PrometheusService {
   readonly register = new client.Registry();
  constructor() {
    this.register.setDefaultLabels({
      service: process.env.SERVICE_NAME ?? 'bong-api',
    });

    client.collectDefaultMetrics({
      register: this.register,
    });
  }

  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}