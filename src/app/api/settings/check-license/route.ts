import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/server/db'
import type { LicenseStatus } from '@/data/models'
import { TRIAL_DURATION_DAYS } from '@/features/tiers'

export const dynamic = 'force-dynamic'

// POST /settings/check-license — validates a license key (stub: accepts any non-empty key)
export async function POST(req: NextRequest) {
  try {
    const { licenseKey } = await req.json() as { licenseKey?: string }
    const settings = await getSettings()

    let status: LicenseStatus
    if (!licenseKey) {
      status = { valid: false, message: 'Kein Lizenzschlüssel angegeben' }
    } else {
      // Accept any non-empty key; extend here for real validation
      let expiresAt: string | null = null
      if (licenseKey.toUpperCase().startsWith('TRIAL-')) {
        expiresAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      }
      status = {
        valid: true,
        message: 'Lizenz gültig',
        expiresAt,
        userLimit: null,
      }
    }

    await updateSettings({ ...settings, licenseKey: licenseKey ?? null, licenseStatus: status })
    return NextResponse.json(status)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
