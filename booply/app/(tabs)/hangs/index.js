import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, ScrollView, Image, StyleSheet, TextInput, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { supabase } from "../../../constants/supabase";

const mascotImage = require("../../../assets/images/bloopy-mascot.png");

/** ---------- helpers ---------- */
function formatDateParts(iso) {
  if (!iso) return { date: null, time: null };
  const d = new Date(iso);

  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return { date, time };
}

function AvatarGroup({ count = 2 }) {
  const n = Math.max(0, Math.min(count, 3));
  return (
    <View className="flex-row items-center gap-1 ml-4">
      {Array.from({ length: n }).map((_, idx) => (
        <View
          key={idx}
          className="w-7 h-7 rounded-full border-2 border-white bg-gray-200"
          style={{ marginLeft: idx > 0 ? -8 : 0 }}
        />
      ))}
      {count > 3 ? (
        <View className="ml-2 rounded-full bg-white/70 px-2 py-1">
          <Text className="text-xs font-semibold text-gray-700">+{count - 3}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CreateHang() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gradientColors = ["#F7FBF8", "#CBE2D3", "#A1C2A8"];

  const [groups, setGroups] = useState([]);
  const [memberCounts, setMemberCounts] = useState({}); // { [groupId]: number }

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) =>
      setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener("keyboardWillHide", () => setKbHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  async function refresh() {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData?.user;
    if (!me?.id) return;

    // membership -> group rows
    const gm = await supabase
      .from("group_members")
      .select("group_id, groups(id,name,start_time,locked)")
      .eq("user_id", me.id)
      .order("updated_at", { ascending: false });

    if (gm.error) {
      console.log("groups fetch error:", gm.error.message);
      return;
    }

    const list = (gm.data || []).map((r) => r.groups).filter(Boolean);
    setGroups(list);

    // Hackathon-friendly: fetch member counts in one shot
    // (If this fails due to RLS, we’ll fall back to showing 2 avatars always.)
    const ids = list.map((g) => g.id);
    if (ids.length) {
      const mc = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", ids);

      if (!mc.error) {
        const counts = {};
        for (const row of mc.data || []) {
          counts[row.group_id] = (counts[row.group_id] || 0) + 1;
        }
        setMemberCounts(counts);
      }
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    return groups.filter((g) => {
      const name = (g?.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [groups, query]);

  const upcoming = useMemo(
    () => filteredGroups.filter((g) => !!g.locked),
    [filteredGroups]
  );

  const recent = useMemo(
    () => filteredGroups.filter((g) => !g.locked),
    [filteredGroups]
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 pt-10 pb-4">
        <View className="flex-row items-center justify-between">
          {!searchOpen ? (
          <Text className="text-3xl font-bold text-gray-900">Create Hang</Text>
          ) : (
            <View
              className="flex-1 mr-3 bg-white border border-gray-300 rounded-full px-4 shadow-sm"
              style={{ height: 48, justifyContent: "center" }}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search hangs..."
                placeholderTextColor="#6b7280"
                autoFocus
                returnKeyType="search"
                style={{ fontSize: 16, paddingVertical: 0, color: "#111827" }}
              />
            </View>
          )}
          <View className="flex-row gap-3">
            {/*<Pressable className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm">
              <MaterialIcons name="search" size={24} color="#374151" />
            </Pressable>*/}

            <Pressable
              onPress={() => {
                if (!searchOpen) {
                  setSearchOpen(true);
                  return;
                }

                // search is open:
                if (query.length > 0) {
                  setQuery(""); // clear text first
                } else {
                  setSearchOpen(false); // then close when empty
                }
              }}
              className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm"
            >
              <MaterialIcons
                name={!searchOpen ? "search" : "close"}
                size={24}
                color="#374151"
              />
            </Pressable>
          </View>
        </View>
      </View>

      <Image pointerEvents="none" source={mascotImage} resizeMode="contain" style={styles.bgMascot} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        className="flex-1"
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{
          paddingBottom: 160 + insets.bottom + kbHeight,
        }}
      >
        {/* Upcoming Section */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center px-1 mb-3">
            <Text className="text-sm font-bold text-blue-900 tracking-wider uppercase">
              Upcoming
            </Text>
          </View>

          <View className="gap-3">
            {upcoming.length === 0 ? (
              <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                <Text className="text-sm text-gray-600">No upcoming hangs yet.</Text>
              </View>
            ) : (
              upcoming.map((g) => {
                const { date, time } = formatDateParts(g.start_time);
                const avatarCount = memberCounts[g.id] ?? 2;

                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push({ pathname: "/(tabs)/hangs/[id]", params: { id: g.id } })}
                    className="bg-[#CFEAEC] border border-cyan-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <MaterialIcons name="more-horiz" size={20} color="#334155" />
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-700">
                          {g.name || "Untitled"}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {date && time ? `${date} • ${time}` : "No time set"}
                        </Text>
                      </View>
                    </View>

                    <AvatarGroup count={avatarCount} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* Recent Section */}
        <View className="px-4 mt-6 pb-32">
          <View className="px-1 mb-3">
            <Text className="text-sm font-bold text-gray-500 tracking-wider uppercase">
              Recent
            </Text>
          </View>

          <View className="gap-3">
            {recent.length === 0 ? (
              <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                <Text className="text-sm text-gray-600">No drafts yet.</Text>
              </View>
            ) : (
              recent.map((g) => {
                const avatarCount = memberCounts[g.id] ?? 2;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push({ pathname: "/(tabs)/hangs/[id]", params: { id: g.id } })}
                    className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <MaterialIcons name="check-circle" size={20} color="#10b981" />
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-700">
                          {g.name || "Untitled"}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          Draft • Tap to finish setup
                        </Text>
                      </View>
                    </View>

                    <AvatarGroup count={avatarCount} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB Button */}
      <Pressable
        onPress={() => router.push("/(tabs)/hangs/create/place")}
        className="absolute bottom-12 right-5 bg-cyan-200 border border-cyan-300 rounded-full w-16 h-16 items-center justify-center shadow-lg"
      >
        <MaterialIcons name="add" size={32} color="#4b7f6b" />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bgMascot: {
    position: "absolute",
    left: "50%",
    bottom: 10,
    width: 220,
    height: 220,
    transform: [{ translateX: -110 }],
    opacity: 1,
  },
});