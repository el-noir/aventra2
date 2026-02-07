import { Module } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { SignalsModule } from '../signals/signals.module';

@Module({
  imports: [SignalsModule],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}
