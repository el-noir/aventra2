export class CreateSignalDto {
  organizationId: number;
  source: string;
  eventType: string;
  contactId?: number;
  accountId?: number;
  metadata?: any;
  timestamp?: Date;
}
