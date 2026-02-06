import { Controller, Get } from '@nestjs/common';
import { StripeConnector } from './stripe.connector';

@Controller('integrations/stripe')
export class StripeController {
  constructor(private readonly stripeConnector: StripeConnector) {}

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
}
