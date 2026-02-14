import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../../mcp/mcp.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly mcpService: MCPService) {}

  async processEvent(rawEvent: any) {
    this.logger.log('Processing Stripe event...');
    this.logger.log(`Event type: ${rawEvent.type}`);
    this.logger.log('Raw event:', JSON.stringify(rawEvent, null, 2));

    // Forward to MCP for normalization, identity resolution, and storage
    await this.mcpService.normalize('stripe', rawEvent);

    this.logger.log('Stripe event forwarded to MCP for normalization');
  }
}
