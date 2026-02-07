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

  async findOrCreateByExternalId(
    organizationId: number,
    source: string,
    externalId: string,
    name?: string,
  ): Promise<Account> {
    let account = await this.findByExternalId(
      organizationId,
      source,
      externalId,
    );

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

  async findByStage(stage: LifecycleStage): Promise<Account[]> {
    return this.accountsRepository.find({
      where: { currentStage: stage },
      order: { stageUpdatedAt: 'DESC' },
    });
  }
}
