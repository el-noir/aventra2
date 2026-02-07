import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);

  async processEvent(rawEvent: any) {
    this.logger.log('Processing HubSpot event...');

    // For now, just log the raw event
    // Later: normalize, store in DB, trigger workflows, etc.
    
    if (Array.isArray(rawEvent)) {
      this.logger.log(`Received ${rawEvent.length} events`);
      rawEvent.forEach((event, index) => {
        this.logger.log(`Event ${index + 1}:`, JSON.stringify(event, null, 2));
      });
    } else {
      this.logger.log('Event data:', JSON.stringify(rawEvent, null, 2));
    }

    // TODO: Add normalization logic here later
    // const signals = this.normalizeEvent(rawEvent);
    // await this.saveSignals(signals);
  }

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
}
