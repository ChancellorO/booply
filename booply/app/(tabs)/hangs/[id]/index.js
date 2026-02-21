import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../../../components/ui";
import { supabase } from "../../../../constants/supabase";

function MiniAvatars({ n = 3 }) {
  return (
    <View className="flex-row items-center">
      {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
        <View
          key={i}
          className="h-9 w-9 rounded-full border-2 border-white bg-emerald-200"
          style={{ marginLeft: i === 0 ? 0 : -10 }}
        />
      ))}
      {n > 3 ? (
        <View className="ml-2 rounded-full bg-white/70 px-2 py-1">
          <Text className="text-xs font-semibold text-slate-700">+{n - 3}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function HangDetailsNice() {
  const { id } = useLocalSearchParams();
  const groupId = id;

  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [meetup, setMeetup] = useState(null); // from group_places
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  const destination = useMemo(() => {
    if (!meetup?.lat || !meetup?.lng) return null;
    return { lat: meetup.lat, lng: meetup.lng };
  }, [meetup]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;

    return members.filter((m) => {
      const name = `${m.profiles?.first_name || ""} ${m.profiles?.last_name || ""}`.trim().toLowerCase();
      return name.includes(q);
    });
  }, [members, search]);

  const pointsToFit = useMemo(() => {
    const pts = [];
    if (destination) pts.push({ latitude: destination.lat, longitude: destination.lng });

    for (const m of filteredMembers) {
      if (m.last_lat && m.last_lng) {
        pts.push({ latitude: m.last_lat, longitude: m.last_lng });
      }
    }
    return pts;
  }, [filteredMembers, destination]);

  const refresh = async () => {
    setLoading(true);

    const g = await supabase
      .from("groups")
      .select("id,name,start_time,locked")
      .eq("id", groupId)
      .single();

    const p = await supabase
      .from("group_places")
      .select("id,group_id,kind,name,lat,lng,radius_m,created_at")
      .eq("group_id", groupId)
      .eq("kind", "meetup")
      .maybeSingle();

    const m = await supabase
      .from("group_members")
      .select("user_id, ready_state, updated_at, last_lat, last_lng, profiles(first_name,last_name,email)")
      .eq("group_id", groupId)
      .order("updated_at", { ascending: false });

    if (!g.error) setGroup(g.data);
    if (!p.error) setMeetup(p.data);
    if (!m.error) setMembers(m.data || []);

    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [groupId]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!pointsToFit.length) return;

    mapRef.current.fitToCoordinates(pointsToFit, {
      edgePadding: { top: 120, right: 60, bottom: 280, left: 60 },
      animated: true,
    });
  }, [pointsToFit]);

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
    <View className="flex-1 bg-white">
      {/* top bar */}
      <View className="px-6 pt-14 pb-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-white/70">
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>

          <View className="flex-1 px-3">
            <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
              {group?.name || "Hang"}
            </Text>
            <Text className="text-xs text-slate-500">
              {members.length} arrived • {Math.max(0, members.length)} mins left
            </Text>
          </View>

          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-white/70">
            <Ionicons name="list" size={20} color="#0F172A" />
          </Pressable>
        </View>

        {/* search bar */}
        <View className="mt-4 rounded-2xl bg-white/80 px-4 py-3 border border-zinc-200">
          <View className="flex-row items-center">
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search friends or places"
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-sm text-slate-900"
            />
          </View>
        </View>
      </View>

      {/* Map */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: destination?.lat ?? 40.73061,
            longitude: destination?.lng ?? -73.935242,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
          showsUserLocation
        >
          {/* Destination */}
          {destination ? (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title={meetup?.name || "Meetup"}
            />
          ) : null}

          {/* Members + simple route lines */}
          {destination
            ? filteredMembers
                .filter((m) => m.last_lat && m.last_lng)
                .map((m) => {
                  const name = m.profiles?.first_name
                    ? `${m.profiles.first_name} ${m.profiles.last_name || ""}`.trim()
                    : m.user_id.slice(0, 6);

                  return (
                    <View key={m.user_id}>
                      <Marker
                        coordinate={{ latitude: m.last_lat, longitude: m.last_lng }}
                        title={name}
                      />
                      <Polyline
                        coordinates={[
                          { latitude: m.last_lat, longitude: m.last_lng },
                          { latitude: destination.lat, longitude: destination.lng },
                        ]}
                        strokeWidth={3}
                      />
                    </View>
                  );
                })
            : null}
        </MapView>

        {/* Floating controls (mimic screenshot vibe) */}
        <View className="absolute right-5 bottom-40 gap-3">
          <Pressable className="h-12 w-12 rounded-full bg-purple-200 items-center justify-center">
            <Ionicons name="git-branch-outline" size={20} color="#6D28D9" />
          </Pressable>
          <Pressable className="h-12 w-12 rounded-full bg-blue-200 items-center justify-center">
            <Ionicons name="locate-outline" size={20} color="#1D4ED8" />
          </Pressable>
          <View className="rounded-2xl bg-white/90 overflow-hidden border border-zinc-200">
            <Pressable className="h-11 w-12 items-center justify-center">
              <Ionicons name="add" size={20} color="#0F172A" />
            </Pressable>
            <View className="h-[1px] bg-zinc-200" />
            <Pressable className="h-11 w-12 items-center justify-center">
              <Ionicons name="remove" size={20} color="#0F172A" />
            </Pressable>
          </View>
        </View>

        {/* Bottom sheet */}
        <View className="absolute left-0 right-0 bottom-0 px-5 pb-10">
          <View className="rounded-3xl bg-white/95 border border-zinc-200 px-5 py-4">
            <Text className="text-sm font-semibold text-slate-900">Arrival Board</Text>
            <Text className="text-xs text-slate-500 mt-1">Someone just arrived!</Text>

            <View className="mt-4 flex-row items-center justify-between">
              <MiniAvatars n={members.length} />

              <Pressable className="rounded-2xl bg-purple-200 px-5 py-3">
                <Text className="text-sm font-semibold text-purple-900">View Group</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}