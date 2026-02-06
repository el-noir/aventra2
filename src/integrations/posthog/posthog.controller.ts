import { Controller, Get } from '@nestjs/common';
import { PosthogConnector } from './posthog.connector';

@Controller('integrations/posthog')
export class PosthogController {
  constructor(private readonly posthogConnector: PosthogConnector) {}

  @Get('test')
  async testConnection() {
    try {
      const isActive = this.posthogConnector.isConnectionActive();

      if (!isActive) {
        await this.posthogConnector.reconnect();
      }

      if (this.posthogConnector.isConnectionActive()) {
        return {
          success: true,
          message: 'PostHog API connection is active',
        };
      } else {
        return {
          success: false,
          error: 'Failed to establish connection to PostHog',
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
