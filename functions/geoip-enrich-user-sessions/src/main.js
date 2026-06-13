import { Client, Query, TablesDB } from 'node-appwrite'

function env(name, fallback = '') {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function envInt(name, fallback) {
  const raw = env(name, '')
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function envBool(name, fallback = false) {
  const raw = env(name, '')
  if (!raw) return fallback
  return ['1', 'true', 'yes', 'y', 'on'].includes(raw.toLowerCase())
}

function isPrivateOrLocalIp(ip) {
  const v = String(ip || '').trim().toLowerCase()
  if (!v) return true

  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) {
    const parts = v.split('.').map((p) => Number.parseInt(p, 10))
    if (parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return true
    const [a, b] = parts
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    return false
  }

  // IPv6 (rough checks)
  if (v === '::1') return true
  if (v.startsWith('fe80:')) return true // link-local
  if (v.startsWith('fc') || v.startsWith('fd')) return true // unique local
  return false
}

function parseLatLon(loc) {
  const raw = String(loc || '').trim()
  if (!raw || !raw.includes(',')) return { latitude: null, longitude: null }
  const [latRaw, lonRaw] = raw.split(',')
  const latitude = Number.parseFloat(String(latRaw || '').trim())
  const longitude = Number.parseFloat(String(lonRaw || '').trim())
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { latitude: null, longitude: null }
  return { latitude, longitude }
}

function cleanString(value, maxLen) {
  const s = String(value || '').trim()
  if (!s) return ''
  return typeof maxLen === 'number' ? s.slice(0, maxLen) : s
}

function nowIso() {
  return new Date().toISOString()
}

async function lookupIpinfo(ip) {
  const token = env('GEOIP_API_TOKEN', '')
  const url = token
    ? `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`
    : `https://ipinfo.io/${encodeURIComponent(ip)}/json`

  const r = await fetch(url, { method: 'GET' })
  if (!r.ok) throw new Error(`GeoIP(ipinfo) failed: ${r.status}`)
  const data = await r.json()

  const { latitude, longitude } = parseLatLon(data?.loc)
  return {
    provider: 'ipinfo',
    countryCode: cleanString(data?.country, 8),
    countryName: '',
    regionName: cleanString(data?.region, 100),
    cityName: cleanString(data?.city, 100),
    timezone: cleanString(data?.timezone, 64),
    latitude,
    longitude
  }
}

async function lookupGeo(ip) {
  const provider = env('GEOIP_PROVIDER', 'ipinfo').toLowerCase()
  if (provider !== 'ipinfo') throw new Error(`Unsupported GEOIP_PROVIDER: ${provider}`)
  return await lookupIpinfo(ip)
}

export default async ({ req, res, log, error }) => {
  try {
    const endpoint = env('APPWRITE_ENDPOINT', env('APPWRITE_FUNCTION_API_ENDPOINT', ''))
    const projectId = env('APPWRITE_PROJECT_ID', env('APPWRITE_FUNCTION_PROJECT_ID', ''))
    const apiKey = env('APPWRITE_API_KEY', '') || (req?.headers?.['x-appwrite-key'] ?? '')

    if (!endpoint) return res.json({ ok: false, error: 'Missing APPWRITE_ENDPOINT' }, 500)
    if (!projectId) return res.json({ ok: false, error: 'Missing APPWRITE_PROJECT_ID' }, 500)
    if (!apiKey) return res.json({ ok: false, error: 'Missing APPWRITE_API_KEY' }, 500)

    const databaseId = env('APPWRITE_DATABASE_ID', 'mindguard')
    const tableId = env('APPWRITE_USER_SESSIONS_TABLE_ID', 'user_sessions')
    const limit = Math.min(Math.max(envInt('BATCH_LIMIT', 50), 1), 200)
    const force = envBool('FORCE_REENRICH', false)

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
    const tablesDB = new TablesDB(client)

    const queries = [Query.limit(limit), Query.orderAsc('$createdAt'), Query.isNotNull('ipAddress')]
    if (!force) queries.push(Query.isNull('geoUpdatedAt'))

    const result = await tablesDB.listRows({ databaseId, tableId, queries })
    const rows = Array.isArray(result?.rows) ? result.rows : []

    let scanned = 0
    let enriched = 0
    let skipped = 0
    const failures = []

    for (const row of rows) {
      scanned += 1
      const rowId = row?.$id
      const ip = cleanString(row?.ipAddress, 128)
      if (!rowId || !ip) {
        skipped += 1
        continue
      }

      if (isPrivateOrLocalIp(ip)) {
        skipped += 1
        continue
      }

      try {
        const geo = await lookupGeo(ip)
        const patch = {
          geoProvider: cleanString(geo.provider, 32),
          geoUpdatedAt: nowIso()
        }

        if (geo.countryCode) patch.countryCode = geo.countryCode
        if (geo.countryName) patch.countryName = cleanString(geo.countryName, 100)
        if (geo.regionName) patch.regionName = geo.regionName
        if (geo.cityName) patch.cityName = geo.cityName
        if (geo.timezone) patch.timezone = geo.timezone
        if (typeof geo.latitude === 'number' && Number.isFinite(geo.latitude)) patch.latitude = geo.latitude
        if (typeof geo.longitude === 'number' && Number.isFinite(geo.longitude)) patch.longitude = geo.longitude

        await tablesDB.updateRow({ databaseId, tableId, rowId, data: patch })
        enriched += 1
      } catch (e) {
        failures.push({ rowId, ip, message: String(e?.message || e) })
        if (typeof error === 'function') error(e)
      }
    }

    const summary = {
      ok: true,
      provider: env('GEOIP_PROVIDER', 'ipinfo'),
      limit,
      force,
      scanned,
      enriched,
      skipped,
      failures: failures.slice(0, 20)
    }

    if (typeof log === 'function') log(JSON.stringify(summary))
    return res.json(summary)
  } catch (e) {
    if (typeof error === 'function') error(e)
    return res.json({ ok: false, error: String(e?.message || e) }, 500)
  }
}
