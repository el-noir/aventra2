import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Account, LifecycleStage } from '../accounts/entities/account.entity';
import { Signal } from '../signals/entities/signal.entity';
import { LIFECYCLE_RULES, STAGE_PROGRESSION } from './lifecycle.rules';
import { LifecycleEvaluation, SignalWindow } from './lifecycle.types';

/**
 * Lifecycle Engine
 * 
 * Deterministic service that evaluates account lifecycle stage
 * based on signal patterns over time.
 * 
 * Flow:
 * 1. Fetch recent signals for account
 * 2. Apply lifecycle rules in order
 * 3. Update account stage if changed
 * 
 * This is explainable, not black-box AI.
 */
@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
  ) {}

  /**
   * Evaluate lifecycle for a single account
   * Called after new signal is stored
   */
  async evaluateAccount(accountId: number): Promise<LifecycleEvaluation> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Fetch recent signals (last 90 days for comprehensive view)
    const signals = await this.fetchRecentSignals(accountId, 90);

    // Evaluate rules
    const evaluation = this.evaluateStage(
      account.id,
      account.currentStage,
      signals,
    );

    // Update if stage changed
    if (evaluation.shouldUpdate) {
      await this.updateAccountStage(
        accountId,
        evaluation.recommendedStage,
        evaluation.reason,
      );
      this.logger.log(
        `Account ${accountId} moved: ${evaluation.currentStage} → ${evaluation.recommendedStage} (${evaluation.reason})`,
      );
    }

    return evaluation;
  }

  /**
   * Evaluate multiple accounts (for scheduled jobs)
   */
  async evaluateAll(organizationId: number): Promise<LifecycleEvaluation[]> {
    const accounts = await this.accountRepository.find({
      where: { organizationId },
    });

    this.logger.log(
      `Evaluating lifecycle for ${accounts.length} accounts in org ${organizationId}`,
    );

    const evaluations = await Promise.all(
      accounts.map((account) => this.evaluateAccount(account.id)),
    );

    const updated = evaluations.filter((e) => e.shouldUpdate).length;
    this.logger.log(`Updated ${updated} account stages`);

    return evaluations;
  }

  /**
   * Core evaluation logic: apply rules in order
   */
  private evaluateStage(
    accountId: number,
    currentStage: LifecycleStage,
    signals: SignalWindow[],
  ): LifecycleEvaluation {
    // Evaluate each stage in priority order
    for (const stage of STAGE_PROGRESSION) {
      const ruleFn = LIFECYCLE_RULES[stage];
      if (ruleFn(signals, currentStage)) {
        const shouldUpdate = stage !== currentStage;
        return {
          accountId,
          currentStage,
          recommendedStage: stage,
          shouldUpdate,
          reason: shouldUpdate
            ? `Matched ${stage} rule (${signals.length} signals)`
            : `Confirmed ${stage}`,
        };
      }
    }

    // Fallback to VISITOR
    return {
      accountId,
      currentStage,
      recommendedStage: LifecycleStage.VISITOR,
      shouldUpdate: currentStage !== LifecycleStage.VISITOR,
      reason: 'No active rules matched, defaulting to visitor',
    };
  }

  /**
   * Fetch recent signals for an account
   */
  private async fetchRecentSignals(
    accountId: number,
    withinDays: number,
  ): Promise<SignalWindow[]> {
    const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);

    const signals = await this.signalRepository.find({
      where: {
        accountId,
        timestamp: MoreThan(cutoff),
      },
      order: { timestamp: 'DESC' },
    });

    return signals.map((s) => ({
      eventType: s.eventType,
      timestamp: s.timestamp,
      source: s.source,
      metadata: s.metadata,
    }));
  }

  /**
   * Update account stage
   */
  private async updateAccountStage(
    accountId: number,
    newStage: LifecycleStage,
    reason: string,
  ): Promise<void> {
    await this.accountRepository.update(accountId, {
      currentStage: newStage,
      stageUpdatedAt: new Date(),
    });

    this.logger.debug(`Account ${accountId} → ${newStage}: ${reason}`);
  }
}
