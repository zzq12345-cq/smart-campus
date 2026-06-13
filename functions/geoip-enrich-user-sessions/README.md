# GeoIP Enrichment (user_sessions)

This Appwrite Function enriches `mindguard.user_sessions` rows with approximate location data derived from `ipAddress` by calling a GeoIP HTTP API (provider A).

## What it does
- Finds rows in `user_sessions` that have `ipAddress` and missing `geoUpdatedAt` (unless `FORCE_REENRICH=true`)
- Calls a GeoIP HTTP API (default: `ipinfo`)
- Writes back: `cityName`, `regionName`, `countryCode`, `countryName`, `timezone`, `latitude`, `longitude`, `geoProvider`, `geoUpdatedAt`

## Required Function variables
- `APPWRITE_API_KEY` (secret): Appwrite API key with permission to read/write TablesDB rows in this project

## Optional variables
- `APPWRITE_ENDPOINT` (defaults to `APPWRITE_FUNCTION_API_ENDPOINT`)
- `APPWRITE_PROJECT_ID` (defaults to `APPWRITE_FUNCTION_PROJECT_ID`)
- `APPWRITE_DATABASE_ID` (default: `mindguard`)
- `APPWRITE_USER_SESSIONS_TABLE_ID` (default: `user_sessions`)

### GeoIP provider (A)
- `GEOIP_PROVIDER` (default: `ipinfo`)
- `GEOIP_API_TOKEN` (optional/secret): ipinfo token

### Batch behavior
- `BATCH_LIMIT` (default: `50`, max: `200`)
- `FORCE_REENRICH` (default: `false`)

## Deploy (Appwrite Console)
1. Functions → Create Function
2. Runtime: Node.js
3. Entrypoint: `src/main.js`
4. Root directory: `functions/geoip-enrich-user-sessions`
5. Add variables above
6. Add Schedule (example): `*/10 * * * *` (every 10 minutes)

## Notes
- This sends IP addresses to a third-party provider (ipinfo) for lookup.

