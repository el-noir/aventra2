import { Controller, Post, Body, Headers, Get } from '@nestjs/common';
import { HubspotConnector } from './hubspot.connector';

@Controller('integrations/hubspot')
export class HubspotController {
  constructor(private readonly hubspotConnector: HubspotConnector) {}

  @Get('test')
  async testConnection() {
    return this.hubspotConnector.testConnection();
  }

}
