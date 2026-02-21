import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "../../../components/ui";
import { Card } from "../../../components/ui";
import { supabase } from "../../../constants/supabase";
import { fmtDateTime } from "../../../constants/geo";

function HangCard({ group, tint = "indigo" }) {
  const bg = tint === "indigo" ? "bg-indigo-100/70" : "bg-emerald-50";
  const title = group.name;
  const subtitle = group.start_time ? fmtDateTime(new Date(group.start_time)) : "Not set yet";

  return (
    <Pressable onPress={() => router.push(`/(app)/hangs/${group.id}`)}>
      <Card className={`${bg} mt-4`}>
        <View className="flex-row items-center">
          <Text className="mr-3 text-lg font-bold text-indigo-600">…</Text>

          <View className="flex-1">
            <Text className="text-lg font-semibold text-slate-800">{title}</Text>
            <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </Card>
    </Pressable>
  );
}

export default function HangsHome() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user?.id) return;

      // show groups you’re a member of
      const gm = await supabase
        .from("group_members")
        .select("group_id, groups(id,name,start_time,locked)")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!gm.error) {
        const list = (gm.data ?? []).map((x) => x.groups).filter(Boolean);
        setGroups(list);
      }
    })();
  }, []);

  const upcoming = groups.filter((g) => g.locked);
  const drafts = groups.filter((g) => !g.locked);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-6 pt-14">
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-extrabold text-slate-900">Create Hang</Text>

            <View className="flex-row items-center gap-3">
              <Pressable className="h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/40">
                <Ionicons name="search" size={20} color="#0F172A" />
              </Pressable>
              <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-orange-200">
                <View className="h-2 w-2 rounded-full bg-white/60" />
              </Pressable>
            </View>
          </View>

          <View className="mt-8 flex-row items-center justify-between">
            <Text className="text-xs font-extrabold tracking-[2px] text-indigo-700 underline">
              UPCOMING
            </Text>
            <Pressable>
              <Text className="text-xs font-bold tracking-[1px] text-slate-700">SEE ALL</Text>
            </Pressable>
          </View>

          {upcoming.length === 0 ? (
            <Text className="mt-4 text-sm text-slate-600">No upcoming hangs yet.</Text>
          ) : (
            upcoming.map((g) => <HangCard key={g.id} group={g} tint="indigo" />)
          )}

          <Text className="mt-10 text-xs font-extrabold tracking-[2px] text-slate-300">DRAFTS</Text>
          {drafts.length === 0 ? (
            <Text className="mt-4 text-sm text-slate-600">No drafts.</Text>
          ) : (
            drafts.map((g) => <HangCard key={g.id} group={g} tint="emerald" />)
          )}

          {/* mascot placeholder */}
          <View className="mt-10 items-center">
            <View className="h-64 w-64 rounded-3xl bg-white/40" />
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        className="absolute bottom-28 right-7 h-16 w-16 items-center justify-center rounded-full"
        style={{
          backgroundColor: "rgba(99, 102, 241, 0.35)",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
        onPress={() => router.push("/(app)/hangs/create")}
      >
        <Ionicons name="add" size={30} color="#10B981" />
      </Pressable>
    </Screen>
  );
}