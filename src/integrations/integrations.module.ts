import { Module } from '@nestjs/common';
import { HubspotController } from './hubspot/hubspot.controller';
import { HubspotConnector } from './hubspot/hubspot.connector';
import { PosthogController } from './posthog/posthog.controller';
import { PosthogConnector } from './posthog/posthog.connector';

@Module({
  controllers: [HubspotController, PosthogController],
  providers: [HubspotConnector, PosthogConnector],
  exports: [HubspotConnector, PosthogConnector],
})
export class IntegrationsModule {}
