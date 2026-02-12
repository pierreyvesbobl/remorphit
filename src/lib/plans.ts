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

export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://remorphit.com';

export function isTrialExpired(createdAt: string | null): boolean {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return now - created > TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
}
