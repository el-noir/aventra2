import { Injectable, Logger } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { ContactsService } from '../contacts/contacts.service';
import { NormalizedEvent } from '../mcp/mcp.types';

export interface ResolvedIdentity {
  accountId?: number;
  contactId?: number;
}

/**
 * Identity Resolution Service
 * 
 * Bridges normalized events to core domain (Account/Contact).
 * Maps external IDs (hubspot_contact_id, stripe_customer_id) 
 * to internal entities.
 * 
 * Flow:
 * 1. Resolve Contact from externalId
 * 2. Resolve Account from companyId or Contact->Account
 * 3. Return accountId + contactId for Signal storage
 */
@Injectable()
export class IdentityResolutionService {
  private readonly logger = new Logger(IdentityResolutionService.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly contactsService: ContactsService,
  ) {}

  /**
   * Resolve external event to internal Account/Contact
   */
  async resolveIdentity(
    event: NormalizedEvent,
  ): Promise<ResolvedIdentity> {
    const resolved: ResolvedIdentity = {};

    // Step 1: Resolve Contact
    const contactId = await this.resolveContact(
      event.organizationId,
      event.source,
      event.metadata,
    );
    if (contactId) {
      resolved.contactId = contactId;
    }

    // Step 2: Resolve Account
    const accountId = await this.resolveAccount(
      event.organizationId,
      event.source,
      event.metadata,
      contactId,
    );
    if (accountId) {
      resolved.accountId = accountId;
    }

    this.logger.debug(
      `Resolved ${event.source} event: contactId=${resolved.contactId}, accountId=${resolved.accountId}`,
    );

    return resolved;
  }

  /**
   * Resolve Contact from external ID
   */
  private async resolveContact(
    organizationId: number,
    source: string,
    metadata: any,
  ): Promise<number | undefined> {
    let externalId: string | undefined;
    let email: string | undefined;
    let name: string | undefined;

    // Extract contact identifiers based on source
    switch (source) {
      case 'hubspot':
        externalId = metadata.sourceId || metadata.objectId;
        email = metadata.properties?.email;
        name = metadata.properties?.firstname
          ? `${metadata.properties.firstname} ${metadata.properties.lastname || ''}`.trim()
          : undefined;
        break;

      case 'stripe':
        externalId = metadata.data?.object?.id;
        email = metadata.data?.object?.email;
        name = metadata.data?.object?.name;
        break;

      case 'customerio':
        externalId = metadata.customer_id;
        email = metadata.email_address;
        break;

      case 'posthog':
        externalId = metadata.distinct_id;
        email = metadata.properties?.$email;
        break;
    }

    if (!externalId) {
      this.logger.warn(
        `No external contact ID found for ${source} event`,
      );
      return undefined;
    }

    // Find or create contact
    const contact = await this.contactsService.findOrCreateByExternalId(
      organizationId,
      source,
      externalId,
      email,
      name,
    );

    return contact.id;
  }

  /**
   * Resolve Account from company ID or Contact association
   */
  private async resolveAccount(
    organizationId: number,
    source: string,
    metadata: any,
    contactId?: number,
  ): Promise<number | undefined> {
    let companyExternalId: string | undefined;
    let companyName: string | undefined;

    // Extract company identifiers based on source
    switch (source) {
      case 'hubspot':
        // HubSpot might have company in event metadata
        companyExternalId = metadata.companyId || metadata.associatedCompanyId;
        companyName = metadata.companyName;
        break;

      case 'stripe':
        // Stripe customer might be linked to account
        companyExternalId = metadata.data?.object?.metadata?.company_id;
        break;

      case 'posthog':
        companyExternalId = metadata.properties?.company_id;
        break;
    }

    // Strategy 1: Direct company ID mapping
    if (companyExternalId) {
      const account = await this.accountsService.findOrCreateByExternalId(
        organizationId,
        source,
        companyExternalId,
        companyName,
      );
      return account.id;
    }

    // Strategy 2: Resolve via Contact->Account relationship
    if (contactId) {
      const contact = await this.contactsService.findById(contactId);
      if (contact?.accountId) {
        return contact.accountId;
      }
    }

    // Strategy 3: Email domain → Account (future enhancement)
    // Could extract domain from email and find/create account

    this.logger.debug(
      `No account resolved for ${source} event (contact: ${contactId})`,
    );
    return undefined;
  }

  /**
   * Batch resolve multiple events
   */
  async resolveIdentities(
    events: NormalizedEvent[],
  ): Promise<ResolvedIdentity[]> {
    return Promise.all(
      events.map((event) => this.resolveIdentity(event)),
    );
  }
}
