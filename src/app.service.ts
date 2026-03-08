import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Dousha Events & Wedding Marketplace API';
  }

  getHealth(): any {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'dousha-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
