export class CreateSignalDto {
  source: string;
  eventType: string;
  accountId?: string;
  userId?: string;
  metadata?: any;
  timestamp?: Date;
}
