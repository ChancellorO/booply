import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  Image,
  StyleSheet,
  TextInput,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "../../../constants/supabase";

const mascotImage = require("../../../assets/images/bloopy-mascot.png");
const fallbackAvatar = require("../../../assets/images/dumbways.png");

/** ---------- helpers ---------- */
function formatDateParts(iso) {
  if (!iso) return { date: null, time: null };
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { date, time };
}

function AvatarGroup({ urls = [], count = 2 }) {
  // If we have urls, render them; otherwise render placeholders.
  const shown = (urls || []).slice(0, 3);
  const showCount = Math.max(count, shown.length);

  return (
    <View className="flex-row items-center ml-4">
      {Array.from({ length: Math.min(showCount, 3) }).map((_, idx) => {
        const uri = shown[idx];
        return (
          <View
            key={idx}
            className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 overflow-hidden"
            style={{ marginLeft: idx > 0 ? -8 : 0 }}
          >
            {uri ? (
              <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Image source={fallbackAvatar} style={{ width: "100%", height: "100%" }} />
            )}
          </View>
        );
      })}

      {showCount > 3 ? (
        <View className="ml-2 rounded-full bg-white/70 px-2 py-1">
          <Text className="text-xs font-semibold text-gray-700">+{showCount - 3}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CreateHang() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#F7FBF8"];

  const [groups, setGroups] = useState([]);
  const [memberCounts, setMemberCounts] = useState({}); // { [groupId]: number }
  const [groupAvatars, setGroupAvatars] = useState({}); // { [groupId]: [url,url,url] }

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kbHeight, setKbHeight] = useState(0);

  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: searchOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [searchOpen, searchAnim]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const refresh = useCallback(async () => {
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

    const ids = list.map((g) => g.id);
    if (!ids.length) {
      setMemberCounts({});
      setGroupAvatars({});
      return;
    }

    // 1) member counts (cheap)
    const mc = await supabase.from("group_members").select("group_id").in("group_id", ids);

    if (!mc.error) {
      const counts = {};
      for (const row of mc.data || []) counts[row.group_id] = (counts[row.group_id] || 0) + 1;
      setMemberCounts(counts);
    }

    // 2) avatar urls for those group members (limit 3 per group in JS)
    const av = await supabase
      .from("group_members")
      .select("group_id, user_id, profiles(avatar_url)")
      .in("group_id", ids)
      .order("updated_at", { ascending: false });

    if (!av.error) {
      const map = {};
      for (const row of av.data || []) {
        const gid = row.group_id;
        const url = row?.profiles?.avatar_url;
        if (!gid) continue;
        if (!map[gid]) map[gid] = [];
        // Keep unique, max 3
        if (url && !map[gid].includes(url) && map[gid].length < 3) {
          map[gid].push(url);
        }
      }
      setGroupAvatars(map);
    }
  }, []);

  // Refresh on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh every time you return to this tab (fixes “create hang -> not updated”)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Realtime refresh (instant updates without force refresh)
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData?.user;
      if (!me?.id || !alive) return;

      const chan = supabase
        .channel(`hangs_list_${me.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${me.id}` },
          () => refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "groups" },
          () => refresh()
        )
        .subscribe();

      return () => supabase.removeChannel(chan);
    })();

    return () => {
      alive = false;
    };
  }, [refresh]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g?.name || "").toLowerCase().includes(q));
  }, [groups, query]);

  // ✅ Upcoming should only be future locked events.
  // ✅ If start_time is in the past, it automatically goes to Recent.
  const now = Date.now();
  const upcoming = useMemo(
    () =>
      filteredGroups.filter((g) => {
        if (!g?.locked) return false;
        if (!g?.start_time) return true; // if no time, keep in upcoming if locked
        return new Date(g.start_time).getTime() >= now;
      }),
    [filteredGroups, now]
  );

  const recent = useMemo(
    () =>
      filteredGroups.filter((g) => {
        if (!g?.locked) return true; // drafts always recent
        if (!g?.start_time) return false;
        return new Date(g.start_time).getTime() < now; // past locked moves here
      }),
    [filteredGroups, now]
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
          <View style={{ flex: 1, marginRight: 12, height: 48, justifyContent: "center" }}>
            {/* Title */}
            <Animated.View
              pointerEvents={searchOpen ? "none" : "auto"}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                opacity: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [
                  {
                    translateY: searchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -6],
                    }),
                  },
                ],
              }}
            >
              <Text className="text-3xl font-bold text-gray-900">Create Hang</Text>
            </Animated.View>

            {/* Search */}
            <Animated.View
              pointerEvents={searchOpen ? "auto" : "none"}
              style={{
                opacity: searchAnim,
                transform: [
                  {
                    translateY: searchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 0],
                    }),
                  },
                ],
              }}
            >
              <View className="bg-white border border-gray-300 rounded-full px-4 shadow-sm" style={{ height: 48, justifyContent: "center" }}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search hangs..."
                  placeholderTextColor="#6b7280"
                  autoFocus={searchOpen}
                  returnKeyType="search"
                  style={{ fontSize: 16, paddingVertical: 0, color: "#111827" }}
                />
              </View>
            </Animated.View>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                if (!searchOpen) {
                  setSearchOpen(true);
                  return;
                }
                if (query.length > 0) setQuery("");
                else setSearchOpen(false);
              }}
              className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm"
            >
              <MaterialIcons name={!searchOpen ? "search" : "close"} size={24} color="#374151" />
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
            <Text className="text-sm font-bold text-blue-900 tracking-wider uppercase">Upcoming</Text>
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
                const urls = groupAvatars[g.id] ?? [];

                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push({ pathname: "/(tabs)/hangs/[id]", params: { id: g.id } })}
                    className="bg-[#CFEAEC] border border-cyan-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <MaterialIcons name="more-horiz" size={20} color="#334155" />
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-700">{g.name || "Untitled"}</Text>
                        <Text className="text-xs text-gray-500">{date && time ? `${date} • ${time}` : "No time set"}</Text>
                      </View>
                    </View>

                    <AvatarGroup urls={urls} count={avatarCount} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* Recent Section */}
        <View className="px-4 mt-6 pb-32">
          <View className="px-1 mb-3">
            <Text className="text-sm font-bold text-gray-500 tracking-wider uppercase">Recent</Text>
          </View>

          <View className="gap-3">
            {recent.length === 0 ? (
              <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                <Text className="text-sm text-gray-600">No drafts yet.</Text>
              </View>
            ) : (
              recent.map((g) => {
                const avatarCount = memberCounts[g.id] ?? 2;
                const urls = groupAvatars[g.id] ?? [];

                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push({ pathname: "/(tabs)/hangs/[id]", params: { id: g.id } })}
                    className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <MaterialIcons name="check-circle" size={20} color="#10b981" />
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-700">{g.name || "Untitled"}</Text>
                        <Text className="text-xs text-gray-500">{g.locked ? "Completed • Tap to view" : "Draft • Tap to finish setup"}</Text>
                      </View>
                    </View>

                    <AvatarGroup urls={urls} count={avatarCount} />
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
        className="absolute bottom-12 right-5 bg-[#CFEAEC] border border-cyan-200 rounded-full w-16 h-16 items-center justify-center shadow-lg"
      >
        <MaterialIcons name="add" size={32} color="#334155" />
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