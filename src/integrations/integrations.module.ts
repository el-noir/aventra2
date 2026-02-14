import { Module } from '@nestjs/common';
import { HubspotController } from './hubspot/hubspot.controller';
import { HubspotConnector } from './hubspot/hubspot.connector';
import { HubspotService } from './hubspot/hubspot.service';
import { PosthogController } from './posthog/posthog.controller';
import { PosthogConnector } from './posthog/posthog.connector';
import { StripeController } from './stripe/stripe.controller';
import { StripeConnector } from './stripe/stripe.connector';
import { StripeService } from './stripe/stripe.service';
import { CustomerioController } from './customerio/customerio.controller';
import { CustomerioConnector } from './customerio/customerio.connector';
import { MCPModule } from '../mcp/mcp.module';

@Module({
  imports: [MCPModule],
  controllers: [
    HubspotController,
    PosthogController,
    StripeController,
    CustomerioController,
  ],
  providers: [
    HubspotConnector,
    HubspotService,
    PosthogConnector,
    StripeConnector,
    StripeService,
    CustomerioConnector,
  ],
  exports: [
    HubspotConnector,
    HubspotService,
    PosthogConnector,
    StripeConnector,
    StripeService,
    CustomerioConnector,
  ],
})
export class IntegrationsModule {}
