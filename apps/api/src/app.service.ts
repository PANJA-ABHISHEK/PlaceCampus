import { Injectable } from '@nestjs/common';

interface HealthCheckResponse {
  service: string;
  version: string;
  status: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthCheckResponse {
    return {
      service: 'PlaceCampus API',
      version: '0.1.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
