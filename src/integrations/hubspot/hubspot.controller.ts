import { Controller, Get, Post, Body, Headers, Logger } from '@nestjs/common';
import { HubspotConnector } from './hubspot.connector';
import { HubspotService } from './hubspot.service';

@Controller('integrations/hubspot')
export class HubspotController {
  private readonly logger = new Logger(HubspotController.name);

  constructor(
    private readonly hubspotConnector: HubspotConnector,
    private readonly hubspotService: HubspotService,
  ) {}

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

  @Get('webhook')
  async verifyWebhook() {
    return {
      status: 'ready',
      message: 'HubSpot webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  async receiveWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('=== HubSpot Webhook Received ===');
    this.logger.log('Headers:', JSON.stringify(headers, null, 2));
    this.logger.log('Body:', JSON.stringify(body, null, 2));

    // Process the event (for now just logging, no normalization)
    await this.hubspotService.processEvent(body);

    return { status: 'ok' };
  }
}
