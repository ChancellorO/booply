export function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

export function metersToMiles(m) {
  return m / 1609.344;
}

// hackathon ETA constants (no API keys)
export function etaMinutes(distanceMeters, mode = "driving") {
  const speed = mode === "walking" ? 1.4 : 11; // m/s
  return Math.max(1, Math.round(distanceMeters / speed / 60));
}

export function leaveBy(startTimeIso, etaMins, bufferMins = 5) {
  const start = new Date(startTimeIso);
  return new Date(start.getTime() - (etaMins + bufferMins) * 60 * 1000);
}

export function fmtDateTime(dt) {
  if (!dt) return "";
  return dt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}