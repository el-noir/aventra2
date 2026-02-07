import { Module } from '@nestjs/common';
import { IdentityResolutionService } from './identity-resolution.service';
import { AccountsModule } from '../accounts/accounts.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [AccountsModule, ContactsModule],
  providers: [IdentityResolutionService],
  exports: [IdentityResolutionService],
})
export class IdentityModule {}
