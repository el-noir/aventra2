import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../../mcp/mcp.service';

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);

  constructor(private readonly mcpService: MCPService) {}

  async processEvent(rawEvent: any) {
    this.logger.log('Processing HubSpot event...');
    this.logger.log('Raw event:', JSON.stringify(rawEvent, null, 2));

    // Forward to MCP for normalization and storage
    await this.mcpService.normalize('hubspot', rawEvent);

    this.logger.log('Event forwarded to MCP for normalization');
  }
}


    // TODO: Add normalization logic here later
    // const signals = this.normalizeEvent(rawEvent);
    // await this.saveSignals(signals);
  

  // Placeholder for future normalization
  // private normalizeEvent(rawEvent: any) {
  //   return rawEvent.events?.map(event => ({
  //     source: 'hubspot',
  //     type: this.mapEventType(event.type),
  //     accountId: event.objectId,
  //     userId: event.userId || null,
  //     timestamp: new Date(event.timestamp),
  //     metadata: event,
  //   })) || [];
  // }

  // private mapEventType(eventType: string) {
  //   const mapping = {
  //     'deal.stage_changed': 'pipeline_change',
  //     'contact.created': 'new_user',
  //     'email.opened': 'marketing_engagement',
  //     'email.clicked': 'marketing_engagement_click',
  //   };
  //   return mapping[eventType] || 'unknown';
  // }

  // private async saveSignals(signals: any[]) {
  //   // Store in database
  // }

