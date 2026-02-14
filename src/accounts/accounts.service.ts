import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, LifecycleStage } from './entities/account.entity';

export interface CreateAccountDto {
  organizationId: number;
  name: string;
  domain?: string;
  externalIds?: Record<string, string>;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {}

  async create(data: CreateAccountDto): Promise<Account> {
    const account = this.accountsRepository.create({
      organizationId: data.organizationId,
      name: data.name,
      domain: data.domain,
      externalIds: data.externalIds || {},
      currentStage: LifecycleStage.VISITOR,
      stageUpdatedAt: new Date(),
    });

    return await this.accountsRepository.save(account);
  }

  async findById(id: number): Promise<Account | null> {
    return this.accountsRepository.findOne({
      where: { id },
      relations: ['contacts'],
    });
  }

  async findByExternalId(
    organizationId: number,
    source: string,
    externalId: string,
  ): Promise<Account | null> {
    const accounts = await this.accountsRepository.find({
      where: { organizationId },
    });
    return accounts.find(
      (account) => account.externalIds?.[`${source}_company_id`] === externalId,
    ) || null;
  }

  async findByName(
    organizationId: number,
    name: string,
  ): Promise<Account | null> {
    return this.accountsRepository.findOne({
      where: { organizationId, name },
    });
  }

  async findByDomain(
    organizationId: number,
    domain: string,
  ): Promise<Account | null> {
    return this.accountsRepository.findOne({
      where: { organizationId, domain },
    });
  }

  async findOrCreateByDomain(
    organizationId: number,
    domain: string,
  ): Promise<Account> {
    let account = await this.findByDomain(organizationId, domain);

    if (!account) {
      // Derive a readable name from domain (acmecorp.com → Acmecorp)
      const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      account = await this.create({
        organizationId,
        name,
        domain,
      });
      this.logger.log(
        `Created new account from email domain: ${account.id} (${domain})`,
      );
    }

    return account;
  }

  async findOrCreateByExternalId(
    organizationId: number,
    source: string,
    externalId: string,
    name?: string,
  ): Promise<Account> {
    // Strategy 1: Find by source-specific external ID
    let account = await this.findByExternalId(
      organizationId,
      source,
      externalId,
    );

    // Strategy 2: Find by name (cross-source dedup)
    if (!account && name) {
      account = await this.findByName(organizationId, name);
      if (account) {
        // Merge: add this source's external ID to the existing account
        const updatedExternalIds = {
          ...account.externalIds,
          [`${source}_company_id`]: externalId,
        };
        await this.accountsRepository.update(account.id, {
          externalIds: updatedExternalIds,
        });
        account.externalIds = updatedExternalIds;
        this.logger.log(
          `Merged ${source} ID (${externalId}) into existing account ${account.id} via name "${name}"`,
        );
      }
    }

    // Strategy 3: Create new account
    if (!account) {
      account = await this.create({
        organizationId,
        name: name || `Account ${externalId}`,
        externalIds: { [`${source}_company_id`]: externalId },
      });
      this.logger.log(
        `Created new account from ${source}: ${account.id} (${externalId})`,
      );
    }

    return account;
  }

  async updateStage(
    accountId: number,
    stage: LifecycleStage,
  ): Promise<Account | null> {
    await this.accountsRepository.update(accountId, {
      currentStage: stage,
      stageUpdatedAt: new Date(),
    });

    return this.findById(accountId);
  }

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async addExternalId(
    accountId: number,
    source: string,
    externalId: string,
  ): Promise<void> {
    const account = await this.findById(accountId);
    if (!account) return;

    const key = `${source}_company_id`;
    if (account.externalIds?.[key] === externalId) return; // already present

    const updatedExternalIds = {
      ...account.externalIds,
      [key]: externalId,
    };
    await this.accountsRepository.update(accountId, {
      externalIds: updatedExternalIds,
    });
    this.logger.log(
      `Added ${source} ID (${externalId}) to account ${accountId}`,
    );
  }

  async findByStage(stage: LifecycleStage): Promise<Account[]> {
    return this.accountsRepository.find({
      where: { currentStage: stage },
      order: { stageUpdatedAt: 'DESC' },
    });
  }
}
