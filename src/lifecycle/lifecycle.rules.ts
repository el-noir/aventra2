import { LifecycleStage } from '../accounts/entities/account.entity';
import { LifecycleRuleFn, SignalWindow } from './lifecycle.types';

/**
 * Helper: Count signals of a specific type within time window
 */
const count = (
  signals: SignalWindow[],
  eventType: string,
  withinDays: number,
): number => {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  return signals.filter(
    (s) => s.eventType === eventType && s.timestamp >= cutoff,
  ).length;
};

/**
 * Helper: Last activity timestamp
 */
const lastActivity = (signals: SignalWindow[]): Date | null => {
  if (signals.length === 0) return null;
  return signals.reduce((latest, s) =>
    s.timestamp > latest ? s.timestamp : latest,
  signals[0].timestamp);
};

/**
 * Helper: Days since last activity
 */
const daysSinceLastActivity = (signals: SignalWindow[]): number => {
  const last = lastActivity(signals);
  if (!last) return Infinity;
  return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
};

/**
 * Helper: Check if there's activity within N days
 */
const hasActivityWithin = (signals: SignalWindow[], days: number): boolean => {
  return daysSinceLastActivity(signals) <= days;
};

/**
 * Helper: Check for high usage signals
 */
const hasHighUsage = (signals: SignalWindow[]): boolean => {
  const recentSignals = signals.filter(
    (s) => s.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  return recentSignals.length >= 20;
};

/**
 * Helper: Check for sales-related signals
 */
const hasSalesSignal = (signals: SignalWindow[]): boolean => {
  return signals.some(
    (s) =>
      s.eventType === 'deal_created' ||
      s.eventType === 'meeting_booked' ||
      s.eventType === 'quote_requested',
  );
};

/**
 * LIFECYCLE RULES
 * 
 * Each rule evaluates whether an account should be in a specific stage.
 * Rules are checked in order of lifecycle progression.
 * 
 * Philosophy:
 * - Rules are deterministic and explainable
 * - Based on observable signal patterns
 * - Time windows keep rules relevant
 */
export const LIFECYCLE_RULES: Record<LifecycleStage, LifecycleRuleFn> = {
  /**
   * VISITOR: Default state, minimal activity
   */
  [LifecycleStage.VISITOR]: (signals) => {
    return signals.length === 0 || signals.length < 3;
  },

  /**
   * TRIAL_STARTED: Explicit trial signal or signup
   */
  [LifecycleStage.TRIAL_STARTED]: (signals) => {
    return signals.some(
      (s) =>
        s.eventType === 'trial_started' ||
        s.eventType === 'account_created' ||
        s.eventType === 'user_signed_up',
    );
  },

  /**
   * ACTIVATED: Consistent recent activity (3+ logins in 7 days)
   */
  [LifecycleStage.ACTIVATED]: (signals) => {
    const loginCount = count(signals, 'login', 7);
    const hasRecentActivity = hasActivityWithin(signals, 7);
    return loginCount >= 3 && hasRecentActivity;
  },

  /**
   * ENGAGED: High signal volume + recent activity
   */
  [LifecycleStage.ENGAGED]: (signals) => {
    const hasVolume = signals.length >= 10;
    const hasRecentActivity = hasActivityWithin(signals, 7);
    const hasConsistentUsage = count(signals, 'login', 14) >= 5;
    return hasVolume && hasRecentActivity && hasConsistentUsage;
  },

  /**
   * AT_RISK: Was active, now quiet (14-30 days)
   */
  [LifecycleStage.AT_RISK]: (signals, currentStage) => {
    // Only mark as at-risk if they were previously engaged/activated
    const wasActive = [
      LifecycleStage.ACTIVATED,
      LifecycleStage.ENGAGED,
      LifecycleStage.EXPANSION_READY,
    ].includes(currentStage);

    const daysSinceLast = daysSinceLastActivity(signals);
    return wasActive && daysSinceLast >= 14 && daysSinceLast < 30;
  },

  /**
   * EXPANSION_READY: High usage + sales signals
   */
  [LifecycleStage.EXPANSION_READY]: (signals) => {
    return hasHighUsage(signals) && hasSalesSignal(signals);
  },

  /**
   * CHURN_RISK: No activity for 30+ days
   */
  [LifecycleStage.CHURN_RISK]: (signals, currentStage) => {
    const wasActive = currentStage !== LifecycleStage.VISITOR;
    const daysSinceLast = daysSinceLastActivity(signals);
    return wasActive && daysSinceLast >= 30;
  },

  /**
   * CHURNED: Explicit churn signal or 90+ days inactive
   */
  [LifecycleStage.CHURNED]: (signals) => {
    const hasChurnSignal = signals.some(
      (s) =>
        s.eventType === 'subscription_cancelled' ||
        s.eventType === 'account_closed',
    );
    const daysSinceLast = daysSinceLastActivity(signals);
    return hasChurnSignal || daysSinceLast >= 90;
  },
};

/**
 * Stage progression order (for evaluation priority)
 */
export const STAGE_PROGRESSION: LifecycleStage[] = [
  LifecycleStage.CHURNED, // Check this first (terminal state)
  LifecycleStage.CHURN_RISK,
  LifecycleStage.EXPANSION_READY,
  LifecycleStage.AT_RISK,
  LifecycleStage.ENGAGED,
  LifecycleStage.ACTIVATED,
  LifecycleStage.TRIAL_STARTED,
  LifecycleStage.VISITOR, // Default fallback
];
