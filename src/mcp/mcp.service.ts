import { Injectable, Logger } from '@nestjs/common';
import { SignalsService } from '../signals/signals.service';
import { NormalizedEvent } from './mcp.types';
import * as mappings from './mcp.mapping.json';

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private readonly eventMappings: any;

  constructor(private readonly signalsService: SignalsService) {
    this.eventMappings = mappings;
  }

  async normalize(source: string, rawEvent: any): Promise<void> {
    this.logger.log(`Normalizing ${source} event...`);

    let normalized: NormalizedEvent[];

    switch (source) {
      case 'hubspot':
        normalized = this.normalizeHubspot(rawEvent);
        break;
      case 'stripe':
        normalized = this.normalizeStripe(rawEvent);
        break;
      case 'customerio':
        normalized = this.normalizeCustomerio(rawEvent);
        break;
      case 'posthog':
        normalized = this.normalizePosthog(rawEvent);
        break;
      default:
        this.logger.warn(`Unknown source: ${source}`);
        return;
    }

    // Save normalized events to database
    for (const event of normalized) {
      await this.signalsService.createSignal({
        source: event.source,
        eventType: event.eventType,
        accountId: event.accountId,
        userId: event.userId,
        timestamp: event.timestamp,
        metadata: event.metadata,
      });
    }

    this.logger.log(
      `Saved ${normalized.length} normalized signals from ${source}`,
    );
  }

  private normalizeHubspot(rawEvent: any): NormalizedEvent[] {
    const events = Array.isArray(rawEvent) ? rawEvent : [rawEvent];

    return events.map((event) => {
      const mappedType = this.mapEventType('hubspot', event.subscriptionType);

      // Log unknown events for future mapping
      if (mappedType === 'unknown') {
        this.logger.warn(
          `⚠️ UNKNOWN EVENT TYPE: "${event.subscriptionType}" from HubSpot`,
        );
        this.logger.warn(
          `Event details: ${JSON.stringify({ eventId: event.eventId, objectId: event.objectId, subscriptionType: event.subscriptionType })}`,
        );
      }

      return {
        source: 'hubspot',
        eventType: mappedType,
        accountId: event.objectId?.toString(),
        userId: event.sourceId,
        timestamp: event.occurredAt
          ? new Date(event.occurredAt)
          : new Date(),
        metadata: {
          ...event,
          originalEventType: event.subscriptionType, // Keep original for reference
        },
      };
    });
  }

  private normalizeStripe(rawEvent: any): NormalizedEvent[] {
    const mappedType = this.mapEventType('stripe', rawEvent.type);

    if (mappedType === 'unknown') {
      this.logger.warn(`⚠️ UNKNOWN EVENT TYPE: "${rawEvent.type}" from Stripe`);
    }

    return [
      {
        source: 'stripe',
        eventType: mappedType,
        accountId: rawEvent.data?.object?.customer,
        userId: rawEvent.data?.object?.id,
        timestamp: rawEvent.created
          ? new Date(rawEvent.created * 1000)
          : new Date(),
        metadata: {
          ...rawEvent,
          originalEventType: rawEvent.type,
        },
      },
    ];
  }

  private normalizeCustomerio(rawEvent: any): NormalizedEvent[] {
    const mappedType = this.mapEventType('customerio', rawEvent.metric);

    if (mappedType === 'unknown') {
      this.logger.warn(
        `⚠️ UNKNOWN EVENT TYPE: "${rawEvent.metric}" from Customer.io`,
      );
    }

    return [
      {
        source: 'customerio',
        eventType: mappedType,
        accountId: rawEvent.customer_id,
        userId: rawEvent.recipient,
        timestamp: rawEvent.timestamp
          ? new Date(rawEvent.timestamp * 1000)
          : new Date(),
        metadata: {
          ...rawEvent,
          originalEventType: rawEvent.metric,
        },
      },
    ];
  }

  private normalizePosthog(rawEvent: any): NormalizedEvent[] {
    const mappedType = this.mapEventType('posthog', rawEvent.event);

    if (mappedType === 'unknown') {
      this.logger.warn(
        `⚠️ UNKNOWN EVENT TYPE: "${rawEvent.event}" from PostHog`,
      );
    }

    return [
      {
        source: 'posthog',
        eventType: mappedType,
        accountId: rawEvent.properties?.company_id,
        userId: rawEvent.distinct_id,
        timestamp: rawEvent.timestamp
          ? new Date(rawEvent.timestamp)
          : new Date(),
        metadata: {
          ...rawEvent,
          originalEventType: rawEvent.event,
        },
      },
    ];
  }

  private mapEventType(source: string, eventType: string): string {
    const mapping = this.eventMappings[source];
    if (!mapping) {
      this.logger.warn(`No mapping found for source: ${source}`);
      return 'unknown';
    }

    const mappedType = mapping[eventType];
    if (!mappedType) {
      this.logger.warn(
        `Unknown event type: ${eventType} for source: ${source}`,
      );
      return 'unknown';
    }

    return mappedType;
  }
}
