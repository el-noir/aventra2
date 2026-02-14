import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactLifecycleStage } from './entities/contact.entity';

export interface CreateContactDto {
  organizationId: number;
  email?: string;
  name?: string;
  accountId?: number;
  externalIds?: Record<string, string>;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
  ) {}

  async create(data: CreateContactDto): Promise<Contact> {
    const contact = this.contactsRepository.create({
      organizationId: data.organizationId,
      email: data.email,
      name: data.name,
      accountId: data.accountId,
      externalIds: data.externalIds || {},
      lifecycleStage: ContactLifecycleStage.LEAD,
    });

    return await this.contactsRepository.save(contact);
  }

  async findById(id: number): Promise<Contact | null> {
    return this.contactsRepository.findOne({
      where: { id },
      relations: ['account', 'organization'],
    });
  }

  async findByExternalId(
    organizationId: number,
    source: string,
    externalId: string,
  ): Promise<Contact | null> {
    const contacts = await this.contactsRepository.find({
      where: { organizationId },
    });
    return contacts.find(
      (contact) =>
        contact.externalIds?.[`${source}_contact_id`] === externalId ||
        contact.externalIds?.[`${source}_customer_id`] === externalId ||
        contact.externalIds?.[`${source}_id`] === externalId,
    ) || null;
  }

  async findByEmail(
    organizationId: number,
    email: string,
  ): Promise<Contact | null> {
    return this.contactsRepository.findOne({
      where: { organizationId, email },
    });
  }

  async findOrCreateByExternalId(
    organizationId: number,
    source: string,
    externalId: string,
    email?: string,
    name?: string,
  ): Promise<Contact> {
    // Strategy 1: Find by source-specific external ID
    let contact = await this.findByExternalId(
      organizationId,
      source,
      externalId,
    );

    // Strategy 2: Find by email (cross-source dedup)
    if (!contact && email) {
      contact = await this.findByEmail(organizationId, email);
      if (contact) {
        // Merge: add this source's external ID to the existing contact
        const updatedExternalIds = {
          ...contact.externalIds,
          [`${source}_contact_id`]: externalId,
        };
        await this.contactsRepository.update(contact.id, {
          externalIds: updatedExternalIds,
          // Update name if we have one and the contact doesn't
          ...(name && !contact.name ? { name } : {}),
        });
        contact.externalIds = updatedExternalIds;
        if (name && !contact.name) contact.name = name;
        this.logger.log(
          `Merged ${source} ID (${externalId}) into existing contact ${contact.id} via email ${email}`,
        );
      }
    }

    // Strategy 3: Create new contact
    if (!contact) {
      contact = await this.create({
        organizationId,
        email,
        name,
        externalIds: { [`${source}_contact_id`]: externalId },
      });
      this.logger.log(
        `Created new contact from ${source}: ${contact.id} (${externalId})`,
      );
    }

    return contact;
  }

  async findByOrganization(organizationId: number): Promise<Contact[]> {
    return this.contactsRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByAccount(accountId: number): Promise<Contact[]> {
    return this.contactsRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStage(
    contactId: number,
    stage: ContactLifecycleStage,
  ): Promise<Contact | null> {
    await this.contactsRepository.update(contactId, {
      lifecycleStage: stage,
    });
    return this.findById(contactId);
  }

  async linkToAccount(
    contactId: number,
    accountId: number,
  ): Promise<void> {
    await this.contactsRepository.update(contactId, { accountId });
    this.logger.log(`Linked contact ${contactId} → account ${accountId}`);
  }
}
