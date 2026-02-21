import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../../components/ui";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { listMyFriends } from "../../../../constants/db";
import { supabase } from "../../../../constants/supabase";

export default function CreateHangMembers() {
  const params = useLocalSearchParams();
  const { name, start_time, meetup_name, meetup_lat, meetup_lng } = params;

  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    (async () => {
      const f = await listMyFriends();
      setFriends(f);
    })();
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selected.size;

  const onCreate = async () => {
    if (loading) return;
    setLoading(true);
    setInfo("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData?.user;
      if (!me?.id) throw new Error("Not logged in");

      // 1) create group
      const g = await supabase
        .from("groups")
        .insert({
          name: (name || "New Hang").trim(),
          created_by: me.id,
          locked: true, // locked because user finished details in wizard
          start_time,
          meetup_name,
          meetup_lat: Number(meetup_lat),
          meetup_lng: Number(meetup_lng),
        })
        .select()
        .single();

      if (g.error) throw g.error;

      // 2) add creator as active member
      const m = await supabase
        .from("group_members")
        .insert({ group_id: g.data.id, user_id: me.id, role: "owner", status: "active" });

      if (m.error) throw m.error;

      // 3) send invites to selected friends
      const ids = Array.from(selected);
      if (ids.length > 0) {
        const payload = ids.map((to) => ({
          group_id: g.data.id,
          from_user: me.id,
          to_user: to,
          status: "pending",
        }));

        const inv = await supabase.from("group_invites").insert(payload);
        if (inv.error) {
          // if duplicates happen, you can special-case 23505 later
          console.log("invite insert error:", inv.error.message);
        }
      }

      router.replace(`/(tabs)/hangs/${g.data.id}`);
    } catch (e) {
      setInfo(e?.message ?? "Create failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="px-6 pt-14">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">Add friends</Text>
          <Pressable onPress={onCreate} className="h-10 px-2 items-center justify-center">
            <Text className="text-sm font-semibold text-indigo-700">Skip</Text>
          </Pressable>
        </View>

        <Text className="mt-4 text-2xl font-extrabold text-slate-900">Who’s coming?</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Select friends to invite. You can invite more later.
        </Text>

        <ScrollView className="mt-5" contentContainerStyle={{ paddingBottom: 140 }}>
          <View className="gap-3">
            {friends.map((f) => {
              const on = selected.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggle(f.id)}
                  className={`rounded-3xl border px-5 py-4 ${
                    on ? "border-indigo-300 bg-indigo-100/60" : "border-zinc-200 bg-white/70"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-slate-900">
                        {f.first_name} {f.last_name}
                      </Text>
                      <Text className="mt-1 text-sm text-slate-600">{f.email}</Text>
                    </View>
                    <Ionicons
                      name={on ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={on ? "#4F46E5" : "#94A3B8"}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {info ? <Text className="mt-4 text-sm text-slate-700">{info}</Text> : null}
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 bg-white/80 border-t border-zinc-200">
          <PrimaryButton
            title={loading ? "Creating..." : `Create Hang${selectedCount ? ` (${selectedCount})` : ""}`}
            onPress={onCreate}
            disabled={loading}
          />
        </View>
      </View>
    </Screen>
  );
}