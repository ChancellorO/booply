// constants/eta.js
import { supabase } from "./supabase";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Fetch the group's meetup destination (lat/lng) from group_places.
 * Assumes you store destination as kind="meetup" with lat/lng columns.
 */
export async function getMeetupDestination(groupId) {
  const { data, error } = await supabase
    .from("group_places")
    .select("lat,lng,name")
    .eq("group_id", groupId)
    .eq("kind", "meetup")
    .maybeSingle();

  if (error) throw error;
  if (!data?.lat || !data?.lng) {
    throw new Error("Meetup location not set for this group yet.");
  }

  return { lat: Number(data.lat), lng: Number(data.lng), name: data.name ?? "Meetup" };
}

/**
 * Google Routes API ETA in seconds.
 * Requires enabling Routes API in Google Cloud.
 */
export async function computeEtaSeconds({ origin, destination }) {
  if (!GOOGLE_KEY) throw new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": "routes.duration",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || "Google Routes API error");
  }

  const durationStr = json?.routes?.[0]?.duration; // e.g. "123s"
  const seconds = durationStr ? Number(durationStr.replace("s", "")) : NaN;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Could not parse ETA duration");
  }

  return seconds;
}

/**
 * Update MY membership row with latest location + ETA.
 * This is the piece your UI calls after accept invite (and optionally on refresh).
 */
export async function updateMyEtaForGroup({ groupId, originLat, originLng }) {
  // 1) get destination
  const dest = await getMeetupDestination(groupId);

  // 2) compute ETA
  const etaSeconds = await computeEtaSeconds({
    origin: { lat: originLat, lng: originLng },
    destination: { lat: dest.lat, lng: dest.lng },
  });

  // 3) write to group_members for this user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData?.user;
  if (!user?.id) throw new Error("Not logged in");

  const payload = {
    last_lat: originLat,
    last_lng: originLng,
    eta_seconds: Math.round(etaSeconds),
    eta_updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await supabase
    .from("group_members")
    .update(payload)
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (updErr) throw updErr;

  return { eta_seconds: Math.round(etaSeconds), meetup_name: dest.name };
}