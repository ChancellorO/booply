import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../../components/ui";
import { Card } from "../../../../components/ui";
import { supabase } from "../../../../constants/supabase";
import { updateMyGroupLocation } from "../../../../constants/liveLocation";
import { haversineMeters, metersToMiles, etaMinutes, leaveBy, fmtDateTime } from "../../../../constants/geo";

export default function HangDetails() {
  const { id } = useLocalSearchParams();
  const groupId = id;

  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);

  async function fetchGroup() {
    const g = await supabase
      .from("groups")
      .select("id,name,locked,start_time,meetup_lat,meetup_lng,meetup_name")
      .eq("id", groupId)
      .single();

    if (!g.error) setGroup(g.data);
    return g.data;
  }

  async function fetchMembers() {
    const m = await supabase
      .from("group_members")
      .select("user_id,role,status,last_lat,last_lng,last_loc_at, profiles(first_name,last_name)")
      .eq("group_id", groupId)
      .eq("status", "active");

    if (!m.error) setMembers(m.data ?? []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const g = await fetchGroup();
      if (g && !g.locked) {
        router.replace(`/(app)/hangs/${groupId}/details`);
        return;
      }
      await fetchMembers();
      setLoading(false);
    })();
  }, [groupId]);

  // Option A: update my location while this screen open
  useEffect(() => {
    let pull;
    let heartbeat;

    (async () => {
      await updateMyGroupLocation(groupId).catch(() => {});
      await fetchMembers();

      heartbeat = setInterval(() => {
        updateMyGroupLocation(groupId).catch(() => {});
      }, 60_000);

      pull = setInterval(() => {
        fetchMembers();
      }, 10_000);
    })();

    return () => {
      if (pull) clearInterval(pull);
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [groupId]);

  const destination = useMemo(() => {
    if (!group?.meetup_lat || !group?.meetup_lng) return null;
    return { lat: group.meetup_lat, lng: group.meetup_lng };
  }, [group]);

  const memberRows = useMemo(() => {
    if (!destination || !group?.start_time) return [];

    return (members ?? [])
      .filter((m) => m.last_lat && m.last_lng)
      .map((m) => {
        const dist = haversineMeters({ lat: m.last_lat, lng: m.last_lng }, destination);
        const mins = etaMinutes(dist, "driving");
        const miles = metersToMiles(dist);
        const leaveAt = leaveBy(group.start_time, mins, 5);

        const name =
          m.profiles?.first_name
            ? `${m.profiles.first_name} ${m.profiles.last_name ?? ""}`.trim()
            : m.user_id.slice(0, 6);

        return { ...m, name, mins, miles, leaveAt };
      })
      .sort((a, b) => a.mins - b.mins);
  }, [members, destination, group?.start_time]);

  useEffect(() => {
    if (!mapRef.current || !destination) return;

    const pts = [
      { latitude: destination.lat, longitude: destination.lng },
      ...memberRows.map((m) => ({ latitude: m.last_lat, longitude: m.last_lng })),
    ];

    if (pts.length > 0) {
      mapRef.current.fitToCoordinates(pts, {
        edgePadding: { top: 90, right: 60, bottom: 320, left: 60 },
        animated: true,
      });
    }
  }, [memberRows, destination]);

  async function leaveGroup() {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData?.user;
    if (!me?.id) return;

    await supabase
      .from("group_members")
      .update({ status: "left" })
      .eq("group_id", groupId)
      .eq("user_id", me.id);

    router.replace("/(app)/hangs");
  }

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-6 pt-14 pb-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">{group?.name}</Text>
          <Pressable onPress={() => router.push(`/(app)/hangs/${groupId}/invite`)} className="h-10 px-2 items-center justify-center">
            <Text className="text-sm font-semibold text-indigo-700">Invite</Text>
          </Pressable>
        </View>
      </View>

      {/* Map */}
      <View className="mx-6 overflow-hidden rounded-3xl bg-white/60" style={{ height: 260 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: destination?.lat ?? 37.7749,
            longitude: destination?.lng ?? -122.4194,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
          showsUserLocation
        >
          {destination ? (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={group?.meetup_name || "Meetup"}
            />
          ) : null}

          {destination
            ? memberRows.map((m) => (
                <View key={m.user_id}>
                  <Marker
                    coordinate={{ latitude: m.last_lat, longitude: m.last_lng }}
                    title={m.name}
                  />
                  <Polyline
                    coordinates={[
                      { latitude: m.last_lat, longitude: m.last_lng },
                      { latitude: destination.lat, longitude: destination.lng },
                    ]}
                    strokeWidth={3}
                  />
                </View>
              ))
            : null}
        </MapView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pt-4">
          <Card className="bg-white/70">
            <Text className="text-xs font-semibold text-slate-500">Meetup</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">
              {group?.meetup_name || "No location set"}
            </Text>

            <Text className="mt-3 text-xs font-semibold text-slate-500">Start time</Text>
            <Text className="mt-1 text-base font-semibold text-slate-900">
              {group?.start_time ? fmtDateTime(new Date(group.start_time)) : "No time set"}
            </Text>
          </Card>

          <Text className="mt-6 text-xs font-extrabold tracking-[2px] text-slate-300">MEMBERS</Text>

          {memberRows.length === 0 ? (
            <Text className="mt-3 text-sm text-slate-600">
              No live locations yet. Open this hang on each phone to start sharing.
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              {memberRows.map((m) => (
                <Card key={m.user_id} className="bg-indigo-100/60">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-slate-900">{m.name}</Text>
                      <Text className="mt-1 text-xs text-slate-600">
                        {m.miles.toFixed(1)} mi • ETA {m.mins} min
                      </Text>
                      <Text className="mt-1 text-xs text-slate-700">
                        Leave by {fmtDateTime(m.leaveAt)}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Pressable
            onPress={leaveGroup}
            className="mt-8 items-center justify-center rounded-2xl bg-zinc-200 py-4"
          >
            <Text className="text-base font-semibold text-zinc-900">Leave hang</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}