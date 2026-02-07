import { Module } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { SignalsModule } from '../signals/signals.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [SignalsModule, IdentityModule],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}
