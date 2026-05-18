export const BULK_CARRIER_TYPES = new Set([70, 71, 72, 73, 74, 75, 76, 77, 78, 79])

export function isBulkCarrier(shipType) {
  return BULK_CARRIER_TYPES.has(shipType)
}

export function parseMessage(raw) {
  let envelope
  try {
    envelope = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!envelope || typeof envelope !== 'object') return null

  const mmsi = envelope.MetaData?.MMSI
  if (!Number.isFinite(mmsi)) return null

  const type = envelope.MessageType
  const inner = envelope.Message?.[type]
  if (!inner) return null

  if (type === 'PositionReport') {
    const lat = inner.Latitude
    const lon = inner.Longitude
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    // Borner aux coordonnées géographiques valides (défense contre données AIS malformées)
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
    return {
      kind: 'position',
      mmsi,
      data: {
        lat,
        lon,
        speed: Number.isFinite(inner.Sog) ? inner.Sog : null,
        course: Number.isFinite(inner.Cog) ? inner.Cog : null,
        heading: Number.isFinite(inner.TrueHeading) && inner.TrueHeading !== 511 ? inner.TrueHeading : null,
        timestamp: Date.now(),
      },
    }
  }

  if (type === 'ShipStaticData') {
    const shipType = inner.Type
    return {
      kind: 'static',
      mmsi,
      data: {
        name: typeof inner.Name === 'string' ? inner.Name.trim() : null,
        destination: typeof inner.Destination === 'string' ? inner.Destination.trim() : null,
        shipType: Number.isFinite(shipType) ? shipType : null,
        isBulkCarrier: isBulkCarrier(shipType),
      },
    }
  }

  return null
}
