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
        // For company events, sourceId is the user who triggered the change
        // For contact events, objectId is the contact
        const isCompanyEvent = metadata.subscriptionType?.startsWith('company.');
        externalId = isCompanyEvent ? metadata.sourceId : (metadata.sourceId || metadata.objectId);
        email = metadata.properties?.email;
        name = metadata.properties?.firstname
          ? `${metadata.properties.firstname} ${metadata.properties.lastname || ''}`.trim()
          : undefined;
        break;

      case 'stripe':
        // For customer objects, use customer ID directly
        // For other objects (invoice, subscription), use the customer field
        const stripeObj = metadata.data?.object;
        if (stripeObj?.object === 'customer') {
          externalId = stripeObj.id;
          email = stripeObj.email;
          name = stripeObj.name;
        } else {
          // invoice, subscription, charge, etc. — reference the customer
          externalId = stripeObj?.customer || stripeObj?.id;
          // Real Stripe invoices use customer_email/customer_name
          email = stripeObj?.customer_email || stripeObj?.email;
          name = stripeObj?.customer_name || stripeObj?.name;
        }
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
        // For company.* events, objectId IS the company ID
        const isCompanyEvent = metadata.subscriptionType?.startsWith('company.');
        if (isCompanyEvent) {
          companyExternalId = String(metadata.objectId);
          companyName = metadata.propertyValue && metadata.propertyName === 'name' 
            ? metadata.propertyValue 
            : metadata.properties?.name;
        } else {
          // For contact/deal events, look for associated company
          companyExternalId = metadata.companyId || metadata.associatedCompanyId;
          companyName = metadata.companyName;
        }
        break;

      case 'stripe':
        // Stripe customer might be linked to account
        companyExternalId = metadata.data?.object?.metadata?.company_id;
        break;

      case 'posthog':
        companyExternalId = metadata.properties?.company_id;
        break;
    }

    // Strategy 1: If the contact already has an account, prefer it
    // and merge the new source's company ID into that account
    if (contactId) {
      const contact = await this.contactsService.findById(contactId);
      if (contact?.accountId) {
        // If we also have a company external ID from this source, merge it
        if (companyExternalId) {
          await this.accountsService.addExternalId(
            contact.accountId,
            source,
            companyExternalId,
          );
          this.logger.debug(
            `Merged ${source} company ID (${companyExternalId}) into existing account ${contact.accountId}`,
          );
        }
        return contact.accountId;
      }
    }

    // Strategy 2: Direct company ID mapping (no existing account on contact)
    if (companyExternalId) {
      const account = await this.accountsService.findOrCreateByExternalId(
        organizationId,
        source,
        companyExternalId,
        companyName,
      );
      return account.id;
    }

    // Strategy 3: Email domain → Account
    // Extract domain from contact email and find/create account by domain
    const email = this.extractEmail(source, metadata);
    if (email) {
      const domain = this.extractDomain(email);
      if (domain) {
        const account = await this.accountsService.findOrCreateByDomain(
          organizationId,
          domain,
        );
        if (account) {
          this.logger.debug(
            `Resolved account ${account.id} from email domain "${domain}"`,
          );
          return account.id;
        }
      }
    }

    this.logger.debug(
      `No account resolved for ${source} event (contact: ${contactId})`,
    );
    return undefined;
  }

  /**
   * Extract email from event metadata based on source
   */
  private extractEmail(source: string, metadata: any): string | undefined {
    switch (source) {
      case 'hubspot':
        return metadata.properties?.email;
      case 'stripe':
        const obj = metadata.data?.object;
        return obj?.email || obj?.customer_email;
      case 'customerio':
        return metadata.email_address;
      case 'posthog':
        return metadata.properties?.$email;
      default:
        return undefined;
    }
  }

  /**
   * Extract company domain from email, ignoring free email providers
   */
  private extractDomain(email: string): string | undefined {
    const FREE_PROVIDERS = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
      'proton.me', 'zoho.com', 'yandex.com', 'live.com',
      'msn.com', 'me.com', 'gmx.com', 'fastmail.com',
    ]);

    const parts = email.split('@');
    if (parts.length !== 2) return undefined;

    const domain = parts[1].toLowerCase();
    if (FREE_PROVIDERS.has(domain)) return undefined;

    return domain;
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
