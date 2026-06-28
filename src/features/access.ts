import type { AppSettings } from '@/data/models'
import { ADD_ONS } from './registry'
import { MODULE_REGISTRY, type ModuleDefinition } from '@/modules/registry'
import { LicenseTier, hasTier } from './tiers'

export { LicenseTier, TIER_LABELS, TIER_COLORS, TRIAL_DURATION_DAYS, ENABLE_TIER_ENFORCEMENT, getLicenseTier, hasTier, getMemberLimits, getTrialDaysRemaining } from './tiers'

/** Tier requirements for features that aren't part of an ADD_ONS entry. */
const FEATURE_TIER_OVERRIDES: Record<string, LicenseTier> = {
  'module.discord': LicenseTier.UNLIMITED,
}

/** Returns true if the given feature is accessible under the current license. */
export function hasFeature(featureId: string, settings: AppSettings): boolean {
  if (featureId in FEATURE_TIER_OVERRIDES) {
    return hasTier(FEATURE_TIER_OVERRIDES[featureId], settings)
  }
  for (const addon of ADD_ONS) {
    const feature = addon.features.find((f) => f.id === featureId)
    if (feature) {
      return hasTier(feature.requiredTier ?? addon.tier, settings)
    }
  }
  if (featureId.startsWith('module.')) {
    const moduleId = featureId.slice('module.'.length)
    const mod = MODULE_REGISTRY.find((m) => m.id === moduleId)
    if (mod) return hasTier(mod.requiredTier, settings)
  }
  return true // unknown feature → allow by default
}

/** Returns the modules accessible under the current license tier. */
export function getAvailableModules(settings: AppSettings): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => hasTier(m.requiredTier, settings))
}
