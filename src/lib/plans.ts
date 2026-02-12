export type PlanType = 'trial' | 'starter' | 'pro';

export const PLAN_LIMITS: Record<PlanType, {
    transformations: number;
    customTemplates: number;
    historyDays: number | null; // null = unlimited
}> = {
    trial:   { transformations: 15,  customTemplates: 1,        historyDays: null },
    starter: { transformations: 50,  customTemplates: 3,        historyDays: 30 },
    pro:     { transformations: 250, customTemplates: Infinity,  historyDays: null },
};

export const TRIAL_DURATION_DAYS = 7;

// Stripe Price ID → Plan mapping (set actual IDs after creating products in Stripe Dashboard)
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanType> = {
    // Starter
    [import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly']: 'starter',
    [import.meta.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly']: 'starter',
    // Pro
    [import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly']: 'pro',
    [import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly']: 'pro',
};

export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://remorphit.com';

export function isTrialExpired(createdAt: string | null): boolean {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return now - created > TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
}
