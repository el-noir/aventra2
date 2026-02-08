import { LifecycleStage } from '../accounts/entities/account.entity';

export interface LifecycleEvaluation {
  accountId: number;
  currentStage: LifecycleStage;
  recommendedStage: LifecycleStage;
  shouldUpdate: boolean;
  reason: string;
}

export interface SignalWindow {
  eventType: string;
  timestamp: Date;
  source: string;
  metadata?: any;
}

export type LifecycleRuleFn = (
  signals: SignalWindow[],
  currentStage: LifecycleStage,
) => boolean;
