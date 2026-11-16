import { base44 } from '@/api/base44Client';

/**
 * Failsafe plan for operators who finish onboarding without choosing a package
 * (the plan-selection step has failed in production). Every operator starts on a
 * 14-day free trial, so a missing selection must never leave an account with no
 * plan at all: it defaults to Elite plus the standard 14-day trial.
 */
export const TRIAL_DAYS = 14;

export function needsDefaultPlan(user) {
  if (!user?.id) return false;
  if (user.primary_account_type !== 'estate_sale_operator') return false;
  if (user.subscription_status === 'trial' || user.subscription_status === 'active') return false;
  return !user.subscription_tier && !user.selected_package;
}

/**
 * Assigns the default Elite 14-day trial when no plan was ever chosen.
 * Returns the refreshed user (unchanged when a plan already exists).
 */
export async function applyDefaultEliteTrial(user) {
  if (!needsDefaultPlan(user)) return user;

  // The Elite package record is the source of truth for tier, price and name.
  // Scoped to the estate sale operator package (other account types have their
  // own Elite bundle).
  const packages = await base44.entities.SubscriptionPackage.filter({
    tier_level: 'elite',
    account_type: 'estate_sale_operator',
    is_active: true,
  });
  const pkg = (Array.isArray(packages) ? packages : packages?.items || [])[0] || null;
  const tier = pkg?.tier_level || 'elite';

  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const updated = await base44.auth.updateMe({
    primary_account_type: 'estate_sale_operator',
    subscription_tier: tier,
    subscription_status: 'trial',
    selected_package: pkg?.id,
  });

  // The trial's end date lives on the Subscription record — the same record a
  // package chosen on the plans page creates — so the dashboard countdown works
  // for a defaulted trial exactly like a chosen one.
  try {
    await base44.entities.Subscription.create({
      user_id: user.id,
      plan_type: 'estate_sale_operator',
      tier,
      price: pkg?.monthly_price || 0,
      billing_period: 'monthly',
      status: 'pending',
      start_date: new Date().toISOString(),
      renewal_date: trialEnd.toISOString(),
      package_name: pkg?.package_name || 'Elite',
      account_type: 'estate_sale_operator',
    });
  } catch (error) {
    console.error('Default trial subscription could not be created:', error);
  }

  return {
    ...user,
    ...(updated && typeof updated === 'object' ? updated : {}),
    subscription_tier: tier,
    subscription_status: 'trial',
    selected_package: pkg?.id || user.selected_package,
  };
}