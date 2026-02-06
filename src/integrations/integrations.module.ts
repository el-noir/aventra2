import { Module } from '@nestjs/common';
import { HubspotController } from './hubspot/hubspot.controller';
import { HubspotConnector } from './hubspot/hubspot.connector';
import { PosthogController } from './posthog/posthog.controller';
import { PosthogConnector } from './posthog/posthog.connector';
import { StripeController } from './stripe/stripe.controller';
import { StripeConnector } from './stripe/stripe.connector';

@Module({
  controllers: [HubspotController, PosthogController, StripeController],
  providers: [HubspotConnector, PosthogConnector, StripeConnector],
  exports: [HubspotConnector, PosthogConnector, StripeConnector],
})
export class IntegrationsModule {}
