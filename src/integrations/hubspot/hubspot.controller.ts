import { Controller, Get } from '@nestjs/common';
import { HubspotConnector } from './hubspot.connector';

@Controller('integrations/hubspot')
export class HubspotController {
  constructor(private readonly hubspotConnector: HubspotConnector) {}

  @Get('test')
  async testConnection() {
    try {
      const isActive = this.hubspotConnector.isConnectionActive();

      if (!isActive) {
        await this.hubspotConnector.reconnect();
      }

      if (this.hubspotConnector.isConnectionActive()) {
        return {
          success: true,
          message: 'HubSpot API connection is active',
        };
      } else {
        return {
          success: false,
          error: 'Failed to establish connection to HubSpot',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
