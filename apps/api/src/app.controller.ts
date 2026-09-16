import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

interface HealthCheckResponse {
  service: string;
  version: string;
  status: string;
  timestamp: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.appService.getHealth();
  }
}
