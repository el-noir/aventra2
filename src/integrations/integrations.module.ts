import { Module } from '@nestjs/common';
import { HubspotController } from './hubspot/hubspot.controller';
import { HubspotConnector } from './hubspot/hubspot.connector';

@Module({
  controllers: [HubspotController],
  providers: [HubspotConnector],
  exports: [HubspotConnector],
})
export class IntegrationsModule {}
