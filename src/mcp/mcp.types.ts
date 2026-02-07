export interface Signal {
  source: string; // hubspot, stripe, customerio, posthog
  type: string; // normalized signal type
  accountId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: any; // raw event details
}

export interface NormalizedEvent {
  source: string;
  eventType: string;
  accountId?: string;
  userId?: string;
  timestamp: Date;
  metadata: any;
}
