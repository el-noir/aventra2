import { Injectable, Logger } from '@nestjs/common';
import { SignalsService } from '../../signals/signals.service';

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);

  constructor(private readonly signalsService: SignalsService) {}

  async processEvent(rawEvent: any) {
    this.logger.log('Processing HubSpot event...');
    this.logger.log('Raw event:', JSON.stringify(rawEvent, null, 2));

    // Just save raw events - MCP will handle normalization
    if (Array.isArray(rawEvent)) {
      for (const event of rawEvent) {
        await this.signalsService.createSignal({
          source: 'hubspot',
          eventType: event.subscriptionType || 'unknown',
          accountId: event.objectId?.toString(),
          userId: event.sourceId,
          metadata: event,
          timestamp: event.occurredAt ? new Date(event.occurredAt) : new Date(),
        });
      }
    } else {
      await this.signalsService.createSignal({
        source: 'hubspot',
        eventType: rawEvent.subscriptionType || 'unknown',
        accountId: rawEvent.objectId?.toString(),
        userId: rawEvent.sourceId,
        metadata: rawEvent,
        timestamp: rawEvent.occurredAt
          ? new Date(rawEvent.occurredAt)
          : new Date(),
      });
    }

    this.logger.log('Event(s) saved to database');
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

