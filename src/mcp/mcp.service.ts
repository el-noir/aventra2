import { Injectable, Logger } from '@nestjs/common';
import { SignalsService } from '../signals/signals.service';
import { IdentityResolutionService } from '../identity/identity-resolution.service';
import { NormalizedEvent } from './mcp.types';
import * as mappings from './mcp.mapping.json';

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private readonly eventMappings: any;

  constructor(
    private readonly signalsService: SignalsService,
    private readonly identityResolutionService: IdentityResolutionService,
  ) {
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

    // Save normalized events to database with identity resolution
    for (const event of normalized) {
      // Resolve external IDs → internal Account/Contact
      const identity = await this.identityResolutionService.resolveIdentity(
        event,
      );

      await this.signalsService.createSignal({
        organizationId: event.organizationId,
        source: event.source,
        eventType: event.eventType,
        accountId: identity.accountId,
        contactId: identity.contactId,
        timestamp: event.timestamp,
        metadata: event.metadata,
      });

      this.logger.debug(
        `Stored signal: ${event.eventType} (contact: ${identity.contactId}, account: ${identity.accountId})`,
      );
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
        organizationId: 1, // TODO: Get from webhook context
        source: 'hubspot',
        eventType: mappedType,
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
        organizationId: 1, // TODO: Get from webhook context
        source: 'stripe',
        eventType: mappedType,
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
        organizationId: 1, // TODO: Get from webhook context
        source: 'customerio',
        eventType: mappedType,
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
        organizationId: 1, // TODO: Get from webhook context
        source: 'posthog',
        eventType: mappedType,
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
