import { Module } from '@nestjs/common';
import { MCPService } from './mcp.service';
import { SignalsModule } from '../signals/signals.module';
import { IdentityModule } from '../identity/identity.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [SignalsModule, IdentityModule, LifecycleModule, ContactsModule],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}
