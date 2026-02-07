export interface Signal {
  source: string; // hubspot, stripe, customerio, posthog
  type: string; // normalized signal type
  organizationId: number;
  contactId?: number;
  accountId?: number;
  timestamp: Date;
  metadata?: any; // raw event details
}

export interface NormalizedEvent {
  organizationId: number;
  source: string;
  eventType: string;
  timestamp: Date;
  metadata: any; // Contains raw external IDs for identity resolution
}
