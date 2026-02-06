import { Controller, Get } from '@nestjs/common';
import { CustomerioConnector } from './customerio.connector';

@Controller('integrations/customerio')
export class CustomerioController {
  constructor(private readonly customerioConnector: CustomerioConnector) {}

  @Get('test')
  async testConnection() {
    const isActive = this.customerioConnector.isConnectionActive();
    const region = this.customerioConnector.getRegion();

    if (!isActive) {
      await this.customerioConnector.reconnect();
      const reconnected = this.customerioConnector.isConnectionActive();

      return {
        status: reconnected ? 'connected' : 'failed',
        region: this.customerioConnector.getRegion(),
        message: reconnected
          ? 'Customer.io connection established after reconnect'
          : 'Failed to connect to Customer.io',
      };
    }

    return {
      status: 'connected',
      region,
      message: 'Customer.io connection is active',
    };
  }
}
