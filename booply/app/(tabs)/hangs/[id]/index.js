import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
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
} from "../../../../constants/db";
import { supabase } from "../../../../constants/supabase";

const fallbackAvatar = require("../../../../assets/images/dumbways.png");

// ✅ Uses the same key you already use for Places — just enable Routes API in Google Cloud
const GOOGLE_ROUTES_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Different colors for each member route
const routeColors = [
  "#7c3aed", // violet
  "#059669", // emerald
  "#2563eb", // blue
  "#f97316", // orange
  "#ef4444", // red
  "#0ea5e9", // sky
  "#22c55e", // green
  "#a855f7", // purple
];

const prettyState = (s) => {
  if (!s) return "—";
  if (s === "getting_ready") return "Getting ready";
  if (s === "showering") return "Showering";
  if (s === "dressing") return "Dressing";
  if (s === "packing") return "Packing";
  if (s === "leaving") return "Leaving now";
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
  // Google returns duration like "123s"
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

export default function HangDetailsMap() {
  const { id } = useLocalSearchParams(); // groupId
  const groupId = String(id);

  const insets = useSafeAreaInsets();
  const gradientColors = ["#F7FBF8", "#CBE2D3", "#A1C2A8"];

  const [meetup, setMeetup] = useState(null);
  const [members, setMembers] = useState([]);
  const [meId, setMeId] = useState(null);

  const [initialRegion, setInitialRegion] = useState(null);
  const mapRef = useRef(null);

  // { [userId]: { coords: [{latitude,longitude}], durationSec, distanceMeters } }
  const [routesByUser, setRoutesByUser] = useState({});

  // bottom sheet snap points (collapsed + expanded)
  const snapPoints = useMemo(() => ["18%", "72%"], []);

  const refresh = useCallback(async () => {
    const [m, place] = await Promise.all([
      listGroupMembers(groupId),
      getLatestMeetup(groupId),
    ]);
      console.log("meetup:", place?.lat, place?.lng);
  console.log("members with coords:", (m || []).filter(x => Number.isFinite(x.last_lat) && Number.isFinite(x.last_lng)).length);

    setMembers(m);
    setMeetup(place);
  }, [groupId]);

  // load auth + initial region
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMeId(data?.user?.id ?? null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // NYC fallback
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
    })();
  }, []);

  // initial data + realtime subscriptions
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
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [groupId, refresh]);

  const title = meetup?.name || "Hang";

  // convenience: center map on meetup when available
  useEffect(() => {
    if (!meetup?.lat || !meetup?.lng || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: meetup.lat,
        longitude: meetup.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      650
    );
  }, [meetup]);

  useEffect(() => {
  if (!meId) return;

  // run immediately once
  updateMyLocation();

  // then keep updating
  const id = setInterval(updateMyLocation, 8000);
  return () => clearInterval(id);
}, [meId, updateMyLocation]);

  const updateMyLocation = useCallback(async () => {
  try {
    if (!meId) return;

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = loc?.coords?.latitude;
    const lng = loc?.coords?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const { error } = await supabase
      .from("group_members")
      .update({
        last_lat: lat,
        last_lng: lng,
        last_loc_at: new Date().toISOString(),
      })
      .eq("group_id", groupId)
      .eq("user_id", meId);

    if (error) console.log("update location error:", error.message);
  } catch (e) {
    console.log("updateMyLocation error:", e?.message ?? e);
  }
}, [groupId, meId]);

  const myDisplayName = useMemo(() => {
    const mine = members.find((m) => m.user_id === meId);
    return mine ? displayNameFromMember(mine) : "Someone";
  }, [members, meId]);

  const setStatusAndNotify = useCallback(
    async (nextStatus) => {
      try {
        await setMyReadyState(groupId, nextStatus);

        await notifyGroupSimple(
          groupId,
          "Hang update",
          `${myDisplayName} is now ${prettyState(nextStatus)}`,
          { groupId, status: nextStatus }
        );
      } catch (e) {
        console.log("status notify error:", e?.message ?? e);
      }
    },
    [groupId, myDisplayName]
  );

  const myMember = useMemo(
    () => members.find((m) => m.user_id === meId) ?? null,
    [members, meId]
  );

  const arrivedCount = useMemo(
    () => members.filter((m) => m.ready_state === "arrived").length,
    [members]
  );

  const statusButtons = [
    { key: "showering", label: "Showering", icon: "water-outline" },
    { key: "dressing", label: "Dressing", icon: "shirt-outline" },
    { key: "packing", label: "Packing", icon: "briefcase-outline" },
    { key: "leaving", label: "Leaving!", icon: "rocket-outline" },
  ];
  // ---- ROUTES API CALL (member -> meetup) ----
  const computeRoute = useCallback(
    async ({ fromLat, fromLng, toLat, toLng }) => {
      if (!GOOGLE_ROUTES_KEY) throw new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
      const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

      const body = {
        origin: { location: { latLng: { latitude: fromLat, longitude: fromLng } } },
        destination: { location: { latLng: { latitude: toLat, longitude: toLng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        polylineQuality: "OVERVIEW",
        polylineEncoding: "ENCODED_POLYLINE",
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_ROUTES_KEY,
          // request only what we need
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
      const distanceMeters = Number.isFinite(r?.distanceMeters) ? r.distanceMeters : null;
      const encoded = r?.polyline?.encodedPolyline;

      const coords = encoded
        ? polyline.decode(encoded).map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
        : [];

      return { coords, durationSec: durSec, distanceMeters };
    },
    []
  );

  // Build routes for members when we have meetup + member coords
  useEffect(() => {
    if (!meetup?.lat || !meetup?.lng) return;

    const withCoords = members.filter(
      (m) => Number.isFinite(m.last_lat) && Number.isFinite(m.last_lng)
    );

    // hackathon safety: limit routes so you don't spam the API
    const MAX_ROUTES = 8;
    const limited = withCoords.slice(0, MAX_ROUTES);

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
  }, [members, meetup?.lat, meetup?.lng, computeRoute]);

  if (!initialRegion) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      {/* MAP */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* meetup marker */}
          {meetup?.lat && meetup?.lng ? (
            <Marker
              coordinate={{ latitude: meetup.lat, longitude: meetup.lng }}
              title={meetup.name || "Meetup"}
              description={meetup.radius_m ? `${meetup.radius_m}m radius` : ""}
              pinColor="#0f172a"
            />
          ) : null}

          {/* ROUTE LINES */}
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

          {/* member markers if you have coords */}
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
                  <View
                    className={`rounded-full border-2 ${
                      isMe ? "border-emerald-500" : "border-white"
                    } bg-white p-1`}
                  >
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
              className="bg-white/80 border border-white/60 rounded-full w-12 h-12 items-center justify-center shadow-sm"
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </Pressable>

            <View className="items-center">
              <Text className="text-base font-extrabold text-slate-900">{title}</Text>
              <Text className="text-xs font-semibold text-slate-500">
                {arrivedCount} arrived • swipe up
              </Text>
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
              {/* Top mini-card */}
              <View className="rounded-3xl border border-white/60 bg-white/60 p-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center">
                      <View className="h-2 w-2 rounded-full bg-violet-400 mr-2" />
                      <Text className="text-xs font-extrabold tracking-widest text-slate-400">
                        COMING UP
                      </Text>
                    </View>
                    <Text className="mt-2 text-3xl font-extrabold text-slate-900">
                      {meetup?.name || "Pick a meetup"}
                    </Text>
                    <View className="mt-2 flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text className="ml-1 text-sm font-semibold text-slate-500">
                        {meetup?.name ? "Meetup location" : "No location set"}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-xs font-extrabold tracking-widest text-slate-400">
                      STARTS AT
                    </Text>
                    <Text className="mt-1 text-xl font-extrabold text-slate-900">
                      {meetup?.start_time
                        ? new Date(meetup.start_time).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setStatusAndNotify("leaving")}
                  className="mt-5 rounded-full bg-emerald-200/70 border border-emerald-200 px-6 py-4"
                >
                  <Text className="text-center text-base font-extrabold text-emerald-900">
                    I’m leaving now
                  </Text>
                </Pressable>

                <Text className="mt-3 text-center text-xs font-semibold text-slate-400">
                  Updates your status for everyone
                </Text>
              </View>

              {/* Quick Status */}
              <View className="mt-6">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-extrabold tracking-widest text-slate-400">
                    MY QUICK STATUS
                  </Text>
                  <View className="rounded-full bg-emerald-100 px-3 py-1">
                    <Text className="text-xs font-extrabold text-emerald-700">
                      {myMember?.ready_state ? prettyState(myMember.ready_state) : "Active"}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row justify-between">
                  {statusButtons.map((b) => {
                    const active = myMember?.ready_state === b.key;
                    return (
                      <Pressable
                        key={b.key}
                        onPress={() => setStatusAndNotify(b.key)}
                        className={`items-center justify-center rounded-2xl px-3 py-3 border ${
                          active ? "bg-emerald-100 border-emerald-200" : "bg-white/60 border-white/60"
                        }`}
                        style={{ width: "23%" }}
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

              {/* Group status list */}
              <View className="mt-8">
                <Text className="text-xs font-extrabold tracking-widest text-slate-400">
                  GROUP STATUS
                </Text>

                <View className="mt-3 gap-3">
                  {members.map((m) => {
                    const name = displayNameFromMember(m);
                    const status = prettyState(m.ready_state);
                    const avatar = m?.profiles?.avatar_url;

                    const route = routesByUser?.[m.user_id];
                    const etaStr = fmtETAFromSeconds(route?.durationSec);
                    const distStr = fmtDistance(route?.distanceMeters);

                    return (
                      <View
                        key={m.user_id}
                        className="rounded-2xl bg-white/60 border border-white/60 px-4 py-3 flex-row items-center"
                      >
                        <Image
                          source={avatar ? { uri: avatar } : fallbackAvatar}
                          style={{ width: 46, height: 46, borderRadius: 999 }}
                        />

                        <View className="ml-3 flex-1">
                          <Text className="text-base font-extrabold text-slate-900">{name}</Text>

                          {/* status + ETA + distance */}
                          <View className="mt-0.5 flex-row items-center flex-wrap">
                            <Text className="text-xs font-semibold text-slate-500">{status}</Text>
                            <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
                            <Text className="text-xs font-extrabold text-slate-700">
                              ETA {etaStr}
                            </Text>
                            <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
                            <Text className="text-xs font-extrabold text-slate-700">
                              {distStr} away
                            </Text>
                          </View>
                        </View>

                        {m.user_id !== meId ? (
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
                            className="rounded-full bg-violet-200/70 border border-violet-200 px-4 py-2"
                          >
                            <Text className="text-xs font-extrabold text-violet-900">Nudge</Text>
                          </Pressable>
                        ) : (
                          <View className="rounded-full bg-slate-100 px-4 py-2">
                            <Text className="text-xs font-extrabold text-slate-500">You</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </LinearGradient>
  );
}