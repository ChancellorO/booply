// HangDetailsMap.jsx (DROP-IN REPLACEMENT FILE)

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import polyline from "@mapbox/polyline";

import {
  getLatestMeetup,
  listGroupMembers,
  setMyReadyState,
  sendNudge,
  notifyGroupSimple,
  applyPunctualityResult, // ✅ add this
} from "../../../../constants/db";
import { supabase } from "../../../../constants/supabase";

const fallbackAvatar = require("../../../../assets/images/dumbways.png");
const GOOGLE_ROUTES_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const routeColors = ["#7c3aed", "#059669", "#2563eb", "#f97316", "#ef4444", "#0ea5e9", "#22c55e", "#a855f7"];

const prettyState = (s) => {
  if (!s) return "—";
  if (s === "getting_ready") return "Getting ready";
  if (s === "showering") return "Showering";
  if (s === "dressing") return "Dressing";
  if (s === "packing") return "Packing";
  if (s === "leaving") return "Leaving";
  if (s === "en_route") return "En route";
  if (s === "close") return "Close";
  if (s === "arrived") return "Arrived";
  if (s === "late") return "Late";
  return s;
};

function displayNameFromMember(m) {
  const p = m?.profiles;
  const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return name || m?.user_id || "Unknown";
}

function parseDurationToSeconds(durationStr) {
  if (!durationStr) return null;
  const m = String(durationStr).match(/^(\d+)s$/);
  return m ? Number(m[1]) : null;
}

function fmtETAFromSeconds(sec) {
  if (!Number.isFinite(sec)) return "—";
  const eta = new Date(Date.now() + sec * 1000);
  return eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDistance(meters) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)}km`;
}

function fmtStartDateTime(iso) {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };
}

function fmtTimeOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Haversine distance (meters)
function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function classifyArrival({ arrivedAtISO, startISO, graceLateMin = 2 }) {
  if (!arrivedAtISO || !startISO) return { status: "on_time", deltaSeconds: 0 };
  const arrivedAt = new Date(arrivedAtISO);
  const start = new Date(startISO);
  const deltaSeconds = Math.round((arrivedAt.getTime() - start.getTime()) / 1000);

  const earlyCutoff = -60; // early if >= 1 min early
  const lateCutoff = graceLateMin * 60;

  let status = "on_time";
  if (deltaSeconds < earlyCutoff) status = "early";
  if (deltaSeconds > lateCutoff) status = "late";

  return { status, deltaSeconds };
}

function etaTimeMs(durationSec) {
  if (!Number.isFinite(durationSec)) return null;
  return Date.now() + durationSec * 1000;
}

function arrivalStatusLabel(s) {
  if (s === "on_time") return "On time";
  if (s === "late") return "Late";
  if (s === "early") return "Early";
  return null;
}

// simple “pressed” animation
function pressStyle(pressed) {
  return {
    transform: [{ scale: pressed ? 0.97 : 1 }],
    opacity: pressed ? 0.92 : 1,
  };
}

export default function HangDetailsMap() {
  const { id } = useLocalSearchParams();
  const groupId = String(id);

  const insets = useSafeAreaInsets();
  const gradientColors = ["#F7FBF8", "#CBE2D3", "#A1C2A8"];

  const [meetup, setMeetup] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [meId, setMeId] = useState(null);

  const [initialRegion, setInitialRegion] = useState(null);
  const mapRef = useRef(null);

  const [routesByUser, setRoutesByUser] = useState({});
  const [routeTick, setRouteTick] = useState(0);
  const [myCoord, setMyCoord] = useState(null); // {lat,lng}

  // optimistic arrived UI
  const [localArrivedAt, setLocalArrivedAt] = useState(null);
  const [localArrivedStatus, setLocalArrivedStatus] = useState(null);

  // ✅ optimistic quick status UI (so highlight happens instantly)
  const [localMyReadyState, setLocalMyReadyState] = useState(null);

  const snapPoints = useMemo(() => ["18%", "72%"], []);

  // config
  const GRACE_LATE_MIN = 2;
  const DEFAULT_AUTO_ARRIVE_THRESHOLD_M = 60;
  const AUTO_ARRIVE_THRESHOLD_M = 150;
  const MANUAL_ARRIVE_THRESHOLD_M = 150;

  const refresh = useCallback(async () => {
    try {
      const [{ data: authData }, m, place] = await Promise.all([
        supabase.auth.getUser(),
        listGroupMembers(groupId),
        getLatestMeetup(groupId),
      ]);

      const g = await supabase
        .from("groups")
        .select("id,name,start_time,locked")
        .eq("id", groupId)
        .maybeSingle();

      if (g?.error) console.log("group fetch err:", g.error.message);

      setMeId(authData?.user?.id ?? null);
      setMembers(m || []);
      setMeetup(place || null);
      setGroupInfo(g?.data ?? null);
    } catch (e) {
      console.log("refresh err:", e?.message ?? e);
    }
  }, [groupId]);

  // initial region + myCoord
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setInitialRegion({
          latitude: 40.73061,
          longitude: -73.935242,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setInitialRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
      setMyCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // realtime subscriptions
  useEffect(() => {
    refresh();

    const chan = supabase
      .channel(`group_${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [groupId, refresh]);

  // center map on meetup
  useEffect(() => {
    if (!meetup?.lat || !meetup?.lng || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: meetup.lat, longitude: meetup.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      650
    );
  }, [meetup]);

  const myMember = useMemo(() => members.find((m) => m.user_id === meId) ?? null, [members, meId]);

  // ✅ clear optimistic quick-status when DB catches up
  useEffect(() => {
    if (!meId) return;
    if (!myMember) return;

    if (localMyReadyState && myMember.ready_state === localMyReadyState) {
      setLocalMyReadyState(null);
    }
  }, [meId, myMember?.ready_state, localMyReadyState, myMember]);

  // clear optimistic state when DB confirms arrived
  useEffect(() => {
    if (myMember?.ready_state === "arrived" && myMember?.arrived_at) {
      if (localArrivedAt) setLocalArrivedAt(null);
      if (localArrivedStatus) setLocalArrivedStatus(null);
      if (localMyReadyState) setLocalMyReadyState(null); // ✅ remove quick status once arrived
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMember?.ready_state, myMember?.arrived_at]);

  const myDisplayName = useMemo(() => {
    const mine = members.find((m) => m.user_id === meId);
    return mine ? displayNameFromMember(mine) : "Someone";
  }, [members, meId]);

  const arrivedCount = useMemo(() => members.filter((m) => m.ready_state === "arrived").length, [members]);

  const startISO = groupInfo?.start_time ?? null;
  const { date: startDateStr, time: startTimeStr } = useMemo(() => fmtStartDateTime(startISO), [startISO]);

  const isPastEvent = useMemo(() => {
    if (!startISO) return false;
    return Date.now() > new Date(startISO).getTime();
  }, [startISO]);

  const meetLatLngOk = Number.isFinite(meetup?.lat) && Number.isFinite(meetup?.lng);
  const meLatLngOk = Number.isFinite(myCoord?.lat) && Number.isFinite(myCoord?.lng);

  const autoArriveThresholdM = useMemo(() => {
    const r = Number(meetup?.radius_m);
    if (Number.isFinite(r) && r > 0) return r;
    return Number.isFinite(AUTO_ARRIVE_THRESHOLD_M) ? AUTO_ARRIVE_THRESHOLD_M : DEFAULT_AUTO_ARRIVE_THRESHOLD_M;
  }, [meetup?.radius_m]);

  const distToMeetupM = useMemo(() => {
    if (!meetLatLngOk || !meLatLngOk) return Infinity;
    return distanceMeters({ lat: myCoord.lat, lng: myCoord.lng }, { lat: meetup.lat, lng: meetup.lng });
  }, [meetLatLngOk, meLatLngOk, myCoord, meetup]);

  const canManualArrive = meetLatLngOk && meLatLngOk && distToMeetupM <= MANUAL_ARRIVE_THRESHOLD_M;

  // arrived from DB OR optimistic local state
  const isArrived = myMember?.ready_state === "arrived" || Boolean(localArrivedAt);

  const arrivedAtEffective = myMember?.arrived_at || localArrivedAt || null;

  const arrivedStatusEffective = useMemo(() => {
    if (myMember?.arrived_status) return myMember.arrived_status;
    if (localArrivedStatus) return localArrivedStatus;
    if (arrivedAtEffective && startISO) {
      return classifyArrival({ arrivedAtISO: arrivedAtEffective, startISO, graceLateMin: GRACE_LATE_MIN }).status;
    }
    return null;
  }, [myMember?.arrived_status, localArrivedStatus, arrivedAtEffective, startISO]);

  const arrivalLabel = arrivalStatusLabel(arrivedStatusEffective);

  // ✅ use optimistic ready-state for immediate highlight/badge
  const myReadyStateEffective = isArrived ? "arrived" : (localMyReadyState || myMember?.ready_state || null);

  // ---------- ARRIVAL + METRICS ----------
  const arrivalLoggedRef = useRef(false);

  const markArrivedAndUpdateMetrics = useCallback(
    async ({ source = "auto" } = {}) => {
      try {
        if (!meId) return;
        if (arrivalLoggedRef.current) return;

        // already arrived in DB
        if (myMember?.ready_state === "arrived" && myMember?.arrived_at) {
          arrivalLoggedRef.current = true;
          return;
        }

        const nowISO = new Date().toISOString();
        const { status: arriveStatus, deltaSeconds } = classifyArrival({
          arrivedAtISO: nowISO,
          startISO,
          graceLateMin: GRACE_LATE_MIN,
        });

        // optimistic UI immediately
        setLocalArrivedAt(nowISO);
        setLocalArrivedStatus(arriveStatus);

        arrivalLoggedRef.current = true;

        // 1) set status via your helper (so all app logic stays consistent)
        await setMyReadyState(groupId, "arrived");

        // 2) persist arrival metadata (authoritative)
        const metaRes = await supabase
          .from("group_members")
          .update({
            ready_state: "arrived",
            arrived_at: nowISO,
            arrived_status: arriveStatus,
            arrived_source: source,
            arrived_delta_seconds: deltaSeconds,
          })
          .eq("group_id", groupId)
          .eq("user_id", meId);

        if (metaRes?.error) console.log("arrival update error:", metaRes.error.message);

        // ✅ 3) update streak + counts on profile (Option A hackathon version)
        try {
          await applyPunctualityResult({
            userId: meId,
            meetupId: groupId,     // ✅ use the group/hang id as the scoring id
            result: arriveStatus,  // "on_time" | "late" | "early"
          });
        } catch (e) {
          console.log("applyPunctualityResult error:", e?.message ?? e);
        }

        // 4) notify group
        await notifyGroupSimple(
          groupId,
          "Arrival ✅",
          `${myDisplayName} arrived ${arriveStatus === "on_time" ? "on time" : arriveStatus === "late" ? "late" : "early"}`,
          { groupId, type: "arrived", arrived_status: arriveStatus }
        );

        refresh();
      } catch (e) {
        arrivalLoggedRef.current = false;
        console.log("arrive flow err:", e?.message ?? e);
      }
    },
    [GRACE_LATE_MIN, groupId, meId, myMember?.ready_state, myMember?.arrived_at, startISO, myDisplayName, refresh, applyPunctualityResult]
  );

  // Auto-arrival
  useEffect(() => {
    if (!meId) return;
    if (!meetLatLngOk || !meLatLngOk) return;
    if (isArrived) return;

    if (distToMeetupM <= autoArriveThresholdM) {
      markArrivedAndUpdateMetrics({ source: "auto" });
    }
  }, [
    meId,
    meetLatLngOk,
    meLatLngOk,
    isArrived,
    distToMeetupM,
    autoArriveThresholdM,
    markArrivedAndUpdateMetrics,
  ]);

  // ---------- STATUS (quick status + leaving) ----------
  const setStatusAndNotify = useCallback(
    async (nextStatus) => {
      try {
        if (!meId) return;
        if (isArrived) return;

        // ✅ optimistic highlight immediately
        setLocalMyReadyState(nextStatus);

        // ✅ persist so everyone sees it in Group Status
        await setMyReadyState(groupId, nextStatus);

        // ✅ push notif (optional but you already do this)
        await notifyGroupSimple(
          groupId,
          "Hang update",
          `${myDisplayName} is now ${prettyState(nextStatus)}`,
          { groupId, type: "status", status: nextStatus }
        );

        // ✅ make sure local view updates even if realtime lags
        refresh();
      } catch (e) {
        // rollback optimistic if it failed
        setLocalMyReadyState(null);
        console.log("status update error:", e?.message ?? e);
      }
    },
    [groupId, meId, isArrived, myDisplayName, refresh]
  );

  // ---------- LIVE LOCATION TRACKING (focused only) ----------
  const watchSubRef = useRef(null);
  const lastDbPushRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 5 },
          async (loc) => {
            if (!alive) return;

            const lat = loc?.coords?.latitude;
            const lng = loc?.coords?.longitude;
            if (typeof lat !== "number" || typeof lng !== "number") return;

            setMyCoord({ lat, lng });

            const now = Date.now();
            if (now - lastDbPushRef.current < 10000) return;
            lastDbPushRef.current = now;

            const { error } = await supabase
              .from("group_members")
              .update({
                last_lat: lat,
                last_lng: lng,
                last_loc_at: new Date().toISOString(),
              })
              .eq("group_id", groupId)
              .eq("user_id", uid);

            if (error) console.log("update location error:", error.message);

            setRouteTick((t) => t + 1);
          }
        );

        watchSubRef.current = sub;
      })();

      return () => {
        alive = false;
        try {
          watchSubRef.current?.remove?.();
        } catch {}
        watchSubRef.current = null;
      };
    }, [groupId])
  );

  useFocusEffect(
    useCallback(() => {
      const id2 = setInterval(() => setRouteTick((t) => t + 1), 12000);
      return () => clearInterval(id2);
    }, [])
  );

  // ---------- ROUTES API ----------
  const computeRoute = useCallback(async ({ fromLat, fromLng, toLat, toLng }) => {
    if (!GOOGLE_ROUTES_KEY) throw new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");

    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
      origin: { location: { latLng: { latitude: fromLat, longitude: fromLng } } },
      destination: { location: { latLng: { latitude: toLat, longitude: toLng } } },
      travelMode: "WALK",
      polylineQuality: "OVERVIEW",
      polylineEncoding: "ENCODED_POLYLINE",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_ROUTES_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      console.log("ROUTES API FAIL:", res.status, JSON.stringify(json));
      throw new Error(json?.error?.message || "Routes API error");
    }

    const r = json?.routes?.[0];
    const durSec = parseDurationToSeconds(r?.duration);
    const distanceMetersVal = Number.isFinite(r?.distanceMeters) ? r.distanceMeters : null;
    const encoded = r?.polyline?.encodedPolyline;

    const coords = encoded ? polyline.decode(encoded).map(([lat, lng]) => ({ latitude: lat, longitude: lng })) : [];
    return { coords, durationSec: durSec, distanceMeters: distanceMetersVal };
  }, []);

  useEffect(() => {
    if (!meetup?.lat || !meetup?.lng) return;

    const membersWithCoords = members.map((m) => {
      if (m.user_id === meId && myCoord?.lat && myCoord?.lng) {
        return { ...m, last_lat: myCoord.lat, last_lng: myCoord.lng };
      }
      return m;
    });

    const withCoords = membersWithCoords.filter((m) => Number.isFinite(m.last_lat) && Number.isFinite(m.last_lng));
    const limited = withCoords.slice(0, 8);

    let cancelled = false;

    (async () => {
      try {
        const pairs = await Promise.all(
          limited.map(async (m) => {
            const out = await computeRoute({
              fromLat: m.last_lat,
              fromLng: m.last_lng,
              toLat: meetup.lat,
              toLng: meetup.lng,
            });
            return [m.user_id, out];
          })
        );

        if (cancelled) return;

        const next = {};
        for (const [userId, out] of pairs) next[userId] = out;
        setRoutesByUser(next);
      } catch (e) {
        console.log("route compute error:", e?.message ?? e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [members, meetup?.lat, meetup?.lng, computeRoute, routeTick, meId, myCoord]);

  if (!initialRegion) return <View className="flex-1 bg-white" />;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {meetup?.lat && meetup?.lng ? (
            <Marker
              coordinate={{ latitude: meetup.lat, longitude: meetup.lng }}
              title={meetup.name || "Meetup"}
              description={meetup.radius_m ? `${meetup.radius_m}m radius` : ""}
              pinColor="#0f172a"
            />
          ) : null}

          {Object.entries(routesByUser).map(([userId, r], idx) => {
            if (!r?.coords?.length) return null;
            return (
              <Polyline
                key={`route_${userId}`}
                coordinates={r.coords}
                strokeWidth={4}
                strokeColor={routeColors[idx % routeColors.length]}
                lineCap="round"
                lineJoin="round"
              />
            );
          })}

          {members
            .filter((m) => Number.isFinite(m.last_lat) && Number.isFinite(m.last_lng))
            .map((m) => {
              const name = displayNameFromMember(m);
              const isMe = m.user_id === meId;
              return (
                <Marker
                  key={m.user_id}
                  coordinate={{ latitude: m.last_lat, longitude: m.last_lng }}
                  title={name}
                  description={prettyState(m.ready_state)}
                >
                  <View className={`rounded-full border-2 ${isMe ? "border-emerald-500" : "border-white"} bg-white p-1`}>
                    <Image
                      source={m?.profiles?.avatar_url ? { uri: m.profiles.avatar_url } : fallbackAvatar}
                      style={{ width: 44, height: 44, borderRadius: 999 }}
                    />
                  </View>
                </Marker>
              );
            })}
        </MapView>

        {/* TOP BAR */}
        <View className="absolute left-0 right-0 top-0 px-4 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => pressStyle(pressed)}
              className="bg-white/80 border border-white/60 rounded-full w-12 h-12 items-center justify-center shadow-sm"
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </Pressable>

            <View className="items-center flex-1 px-2">
              <Text className="text-base font-extrabold text-slate-900" numberOfLines={1} ellipsizeMode="tail">
                {meetup?.name || groupInfo?.name || "Hang"}
              </Text>
              <Text className="text-xs font-semibold text-slate-500">{arrivedCount} arrived • swipe up</Text>
            </View>

            <View className="w-12 h-12" />
          </View>
        </View>

        {/* BOTTOM SHEET */}
        <BottomSheet
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          backgroundStyle={{
            backgroundColor: "rgba(255,255,255,0.88)",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
          handleIndicatorStyle={{ backgroundColor: "rgba(15,23,42,0.18)" }}
        >
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            <View className="px-5 pt-2">
              {/* Top card */}
              <View className="rounded-3xl border border-white/60 bg-white/60 p-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <View className={`h-2 w-2 rounded-full mr-2 ${isPastEvent ? "bg-slate-400" : "bg-violet-400"}`} />
                      <Text className="text-xs font-extrabold tracking-widest text-slate-400">
                        {isPastEvent ? "PASSED EVENT" : "COMING UP"}
                      </Text>
                    </View>

                    <Text className="mt-2 text-3xl font-extrabold text-slate-900" numberOfLines={2} ellipsizeMode="tail">
                      {meetup?.name || groupInfo?.name || "Pick a meetup"}
                    </Text>

                    <View className="mt-2 flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text className="ml-1 text-sm font-semibold text-slate-500" numberOfLines={1}>
                        {meetup?.name ? "Meetup location" : "No location set"}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-xs font-extrabold tracking-widest text-slate-400">STARTS AT</Text>
                    <Text className="mt-1 text-xl font-extrabold text-slate-900">{startTimeStr}</Text>
                    <Text className="text-xs font-semibold text-slate-500">{startDateStr}</Text>
                  </View>
                </View>

                {/* CTA AREA */}
                {isArrived ? (
                  <View className="mt-5 rounded-2xl bg-emerald-100/70 border border-emerald-200 px-5 py-4">
                    <Text className="text-base font-extrabold text-emerald-900 text-center">Arrived ✅</Text>
                    <Text className="mt-1 text-sm font-semibold text-emerald-800 text-center">
                      {arrivedAtEffective ? `Arrived at ${fmtTimeOnly(arrivedAtEffective)}` : "Arrived"}
                      {arrivalLabel ? ` • ${arrivalLabel}` : ""}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={() => setStatusAndNotify("leaving")}
                      style={({ pressed }) => pressStyle(pressed)}
                      className="mt-5 rounded-full bg-emerald-200/70 border border-emerald-200 px-6 py-4"
                    >
                      <Text className="text-center text-base font-extrabold text-emerald-900">I’m leaving now</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => markArrivedAndUpdateMetrics({ source: "manual" })}
                      disabled={!canManualArrive}
                      style={({ pressed }) => pressStyle(pressed)}
                      className={`mt-3 rounded-full px-6 py-3 border ${
                        canManualArrive ? "bg-violet-200/70 border-violet-200" : "bg-slate-200/70 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-extrabold ${
                          canManualArrive ? "text-violet-900" : "text-slate-500"
                        }`}
                      >
                        {canManualArrive ? "I’m here" : `Get within ${MANUAL_ARRIVE_THRESHOLD_M}m to arrive`}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>

              {/* ✅ Quick Status (hidden once arrived) */}
              {!isArrived ? (
                <View className="mt-6">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-extrabold tracking-widest text-slate-400">MY QUICK STATUS</Text>
                    <View className="rounded-full bg-emerald-100 px-3 py-1">
                      <Text className="text-xs font-extrabold text-emerald-700">
                        {myReadyStateEffective ? prettyState(myReadyStateEffective) : "Active"}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row justify-between">
                    {[
                      { key: "showering", label: "Showering", icon: "water-outline" },
                      { key: "dressing", label: "Dressing", icon: "shirt-outline" },
                      { key: "packing", label: "Packing", icon: "briefcase-outline" },
                      { key: "leaving", label: "Leaving!", icon: "rocket-outline" },
                    ].map((b) => {
                      const active = myReadyStateEffective === b.key;

                      return (
                        <Pressable
                          key={b.key}
                          onPress={() => setStatusAndNotify(b.key)}
                          style={({ pressed }) => [{ width: "23%" }, pressStyle(pressed)]} // ✅ FIX: single style prop (no override)
                          className={`items-center justify-center rounded-2xl px-3 py-3 border ${
                            active
                              ? "bg-emerald-100 border-emerald-200"
                              : "bg-white/60 border-white/60"
                          }`}
                        >
                          <View
                            className={`h-12 w-12 items-center justify-center rounded-full ${
                              active ? "bg-emerald-200" : "bg-slate-100"
                            }`}
                          >
                            <Ionicons
                              name={b.icon}
                              size={20}
                              color={active ? "#065f46" : "#64748b"}
                            />
                          </View>
                          <Text
                            className={`mt-2 text-xs font-bold ${
                              active ? "text-emerald-900" : "text-slate-500"
                            }`}
                          >
                            {b.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Group status */}
              <View className="mt-8">
                <Text className="text-xs font-extrabold tracking-widest text-slate-400">GROUP STATUS</Text>

                <View className="mt-3 gap-3">
                  {members.map((m) => {
                    const name = displayNameFromMember(m);
                    const avatar = m?.profiles?.avatar_url;

                    const route = routesByUser?.[m.user_id];
                    const etaStr = fmtETAFromSeconds(route?.durationSec);
                    const distStr = fmtDistance(route?.distanceMeters);

                    const isMemberArrived = m.ready_state === "arrived";
                    const arrivedAt = m.arrived_at;

                    const effectiveArrivedStatus =
                      m.arrived_status ||
                      (arrivedAt && startISO
                        ? classifyArrival({ arrivedAtISO: arrivedAt, startISO, graceLateMin: GRACE_LATE_MIN }).status
                        : null);

                    const arrivedLabel = arrivalStatusLabel(effectiveArrivedStatus);

                    const startMs = startISO ? new Date(startISO).getTime() : null;
                    const etaMs = etaTimeMs(route?.durationSec);
                    const isRunningLate =
                      !isMemberArrived &&
                      Number.isFinite(startMs) &&
                      Number.isFinite(etaMs) &&
                      etaMs > startMs;

                    const cardClass = isMemberArrived
                      ? "bg-emerald-50 border-emerald-200"
                      : isRunningLate
                      ? "bg-rose-50 border-rose-200"
                      : "bg-[#CFEAEC] border-cyan-200";

                    return (
                      <View key={m.user_id} className={`rounded-2xl border px-4 py-3 flex-row items-center ${cardClass}`}>
                        <Image
                          source={avatar ? { uri: avatar } : fallbackAvatar}
                          style={{ width: 46, height: 46, borderRadius: 999 }}
                        />

                        <View className="ml-3 flex-1">
                          <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                            {name}
                          </Text>

                          <View className="mt-0.5 flex-row items-center flex-wrap">
                            {isMemberArrived ? (
                              <Text className="text-xs font-extrabold text-emerald-800">
                                {arrivedLabel ? `Arrived ${arrivedLabel}` : "Arrived"}
                                {arrivedAt ? ` • ${fmtTimeOnly(arrivedAt)}` : ""}
                              </Text>
                            ) : (
                              <>
                                <Text className={`text-xs font-semibold ${isRunningLate ? "text-rose-700" : "text-slate-600"}`}>
                                  {isRunningLate ? "Running late" : prettyState(m.ready_state)}
                                </Text>

                                <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

                                <Text className={`text-xs font-extrabold ${isRunningLate ? "text-rose-800" : "text-slate-700"}`}>
                                  ETA {etaStr}
                                </Text>

                                <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

                                <Text className={`text-xs font-extrabold ${isRunningLate ? "text-rose-800" : "text-slate-700"}`}>
                                  {distStr} away
                                </Text>
                              </>
                            )}
                          </View>
                        </View>

                        {m.user_id !== meId && m.ready_state !== "arrived" ? (
                          <Pressable
                            onPress={async () => {
                              try {
                                await sendNudge(groupId, m.user_id);
                                await notifyGroupSimple(
                                  groupId,
                                  "Nudge 👀",
                                  `${myDisplayName} nudged ${name} to leave`,
                                  { groupId, type: "nudge", to: m.user_id }
                                );
                              } catch (e) {
                                console.log("nudge error:", e?.message ?? e);
                              }
                            }}
                            style={({ pressed }) => pressStyle(pressed)}
                            className="rounded-full bg-violet-200/70 border border-violet-200 px-4 py-2"
                          >
                            <Text className="text-xs font-extrabold text-violet-900">Nudge</Text>
                          </Pressable>
                        ) : (
                          <View className="rounded-full bg-slate-100 px-4 py-2">
                            <Text className="text-xs font-extrabold text-slate-500">
                              {m.user_id === meId ? "You" : "Arrived"}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Debug (optional) */}
              <View className="mt-6">
                <Text className="text-[10px] text-slate-400 text-center">
                  {meetLatLngOk && meLatLngOk
                    ? `You are ~${Math.round(distToMeetupM)}m from meetup (auto ${Math.round(autoArriveThresholdM)}m, manual ${MANUAL_ARRIVE_THRESHOLD_M}m)`
                    : "Waiting for location/meetup coordinates…"}
                </Text>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </LinearGradient>
  );
}