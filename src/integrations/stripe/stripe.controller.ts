import { Controller, Get, Post, Body, Headers, Logger } from '@nestjs/common';
import { StripeConnector } from './stripe.connector';
import { StripeService } from './stripe.service';

@Controller('integrations/stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeConnector: StripeConnector,
    private readonly stripeService: StripeService,
  ) {}

  @Get('test')
  async testConnection() {
    try {
      const isActive = this.stripeConnector.isConnectionActive();

      if (!isActive) {
        await this.stripeConnector.reconnect();
      }

      if (this.stripeConnector.isConnectionActive()) {
        return {
          success: true,
          message: 'Stripe API connection is active',
        };
      } else {
        return {
          success: false,
          error: 'Failed to establish connection to Stripe',
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
      message: 'Stripe webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  async receiveWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('=== Stripe Webhook Received ===');
    this.logger.log(`Event type: ${body.type}`);
    this.logger.log('Body:', JSON.stringify(body, null, 2));

    // Process the event through MCP pipeline
    await this.stripeService.processEvent(body);

    return { status: 'ok' };
  }
}
