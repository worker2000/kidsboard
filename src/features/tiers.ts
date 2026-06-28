import type { AppSettings } from '@/data/models'

/**
 * The 5 commercial license tiers.
 *
 * - COMMUNITY: free, public edition — full base feature set.
 * - TRIAL: time-limited evaluation period. Functionally identical to UNLIMITED
 *   (see EFFECTIVE_TIER_ORDER below) but intended to expire.
 * - PREMIUM: paid, hosted — same feature set as COMMUNITY (no member limit).
 * - UNLIMITED: all modules, unlimited members, Wallboard, Küchentafel, Discord.
 * - LIFETIME: one-time purchase, same scope as UNLIMITED, highest tier.
 */
export enum LicenseTier {
  COMMUNITY = 'COMMUNITY',
  TRIAL = 'TRIAL',
  PREMIUM = 'PREMIUM',
  UNLIMITED = 'UNLIMITED',
  LIFETIME = 'LIFETIME',
}

export const TIER_LABELS: Record<LicenseTier, string> = {
  [LicenseTier.COMMUNITY]: 'Community',
  [LicenseTier.TRIAL]: 'Testphase',
  [LicenseTier.PREMIUM]: 'Premium',
  [LicenseTier.UNLIMITED]: 'Unlimited',
  [LicenseTier.LIFETIME]: 'Lifetime',
}

export const TIER_COLORS: Record<LicenseTier, string> = {
  [LicenseTier.COMMUNITY]: '#64748b',
  [LicenseTier.TRIAL]: '#0ea5e9',
  [LicenseTier.PREMIUM]: '#6366f1',
  [LicenseTier.UNLIMITED]: '#f59e0b',
  [LicenseTier.LIFETIME]: '#a855f7',
}

/** Default length of a TRIAL license, used when activating a trial key that doesn't carry its own `expiresAt`. */
export const TRIAL_DURATION_DAYS = 14

/**
 * Phase 2 preparation switch — central kill switch for tier-based access
 * restrictions.
 *
 * - `false` (default): navigation shows all modules regardless of
 *   `requiredTier`, preserving current behavior for existing installs.
 * - `true`: `getNavModulesForRole()` filters out modules whose
 *   `requiredTier` isn't met by the current license (PREMIUM/UNLIMITED
 *   modules are hidden for COMMUNITY users).
 *
 * Set via `NEXT_PUBLIC_ENABLE_TIER_ENFORCEMENT=true` (build-time, since this
 * is read in client components). Must be enabled before public release —
 * see LICENSE_TIERS.md.
 */
export const ENABLE_TIER_ENFORCEMENT = process.env.NEXT_PUBLIC_ENABLE_TIER_ENFORCEMENT === 'true'

/**
 * Effective rank used for `hasTier()` comparisons. TRIAL is intentionally
 * ranked alongside UNLIMITED — a trial unlocks everything UNLIMITED does,
 * it's just time-limited (expiry is handled via `licenseStatus.expiresAt`).
 */
const EFFECTIVE_TIER_ORDER: Record<LicenseTier, number> = {
  [LicenseTier.COMMUNITY]: 0,
  [LicenseTier.PREMIUM]: 1,
  [LicenseTier.TRIAL]: 2,
  [LicenseTier.UNLIMITED]: 2,
  [LicenseTier.LIFETIME]: 3,
}

/**
 * Determines the active license tier from app settings.
 *
 * Key prefixes (mirrors the legacy heuristic in
 * /opt/familytool-api/licenseCheck.js `tierFromKey`):
 * - `LIFETIME...`  → LIFETIME
 * - `PREMIUM-...`  → PREMIUM
 * - `TRIAL-...`    → TRIAL
 * - any other valid key (incl. legacy `PRO-...` and the new license server's
 *   `plan: "default"`) → UNLIMITED, so existing licenses keep full access.
 */
export function getLicenseTier(settings: AppSettings): LicenseTier {
  if (!settings.licenseStatus?.valid) return LicenseTier.COMMUNITY
  const key = (settings.licenseKey || '').toUpperCase()
  if (key.startsWith('LIFETIME')) return LicenseTier.LIFETIME
  if (key.startsWith('PREMIUM-')) return LicenseTier.PREMIUM
  if (key.startsWith('TRIAL-')) {
    const expiresAt = settings.licenseStatus.expiresAt
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return LicenseTier.COMMUNITY
    return LicenseTier.TRIAL
  }
  return LicenseTier.UNLIMITED
}

/**
 * Returns the number of days remaining on an active TRIAL license, or `null`
 * if the current tier isn't TRIAL or has no expiry set.
 */
export function getTrialDaysRemaining(settings: AppSettings): number | null {
  if (getLicenseTier(settings) !== LicenseTier.TRIAL) return null
  const expiresAt = settings.licenseStatus?.expiresAt
  if (!expiresAt) return null
  const msRemaining = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
}

/** Returns true if the current settings' tier meets or exceeds `required`. */
export function hasTier(required: LicenseTier, settings: AppSettings): boolean {
  const tier = getLicenseTier(settings)
  return EFFECTIVE_TIER_ORDER[tier] >= EFFECTIVE_TIER_ORDER[required]
}

/**
 * Returns the family member limits for the current tier, or `null` if the
 * family size is unlimited.
 *
 * Only COMMUNITY is capped (default 1 adult + 1 child, configurable via
 * `settings.freeTier`). PREMIUM and above have no member limit.
 */
export function getMemberLimits(settings: AppSettings): { adults: number; children: number } | null {
  if (getLicenseTier(settings) === LicenseTier.COMMUNITY) {
    return settings.freeTier ?? { adults: 1, children: 1 }
  }
  return null
}
