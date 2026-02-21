import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { listMyFriends, listGroupMemberIds, listPendingInviteIds, inviteUserToGroup } from "../../../../constants/db";
import { supabase } from "../../../../constants/supabase";

export default function CreateHangInvite() {
  const { groupId } = useLocalSearchParams();
  const [friends, setFriends] = useState([]);
  const [info, setInfo] = useState("");
  const [locking, setLocking] = useState(false);

  const refresh = async () => {
    const [all, memberIds, pendingIds] = await Promise.all([
      listMyFriends(),
      listGroupMemberIds(groupId),
      listPendingInviteIds(groupId),
    ]);

    const filtered = all.filter((f) => !memberIds.has(f.id) && !pendingIds.has(f.id));
    setFriends(filtered);
  };

  useEffect(() => {
    refresh().catch((e) => console.log(e.message));
  }, [groupId]);

  const inviteOne = async (friend) => {
    try {
      await inviteUserToGroup(groupId, friend.id);
      setInfo(`Invited ${friend.first_name} ✅`);
      setFriends((prev) => prev.filter((x) => x.id !== friend.id));
    } catch (e) {
      console.log("invite error:", e.message);
    }
  };

  const onCreateHang = async () => {
    if (locking) return;
    setLocking(true);
    try {
      const u = await supabase.from("groups").update({ locked: true }).eq("id", groupId);
      if (u.error) throw u.error;
      router.replace(`/(tabs)/hangs/${groupId}`);
    } catch (e) {
      console.log("lock error:", e?.message ?? e);
    } finally {
      setLocking(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-14">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">Who’s coming?</Text>
          <Pressable onPress={onCreateHang} className="h-10 px-2 items-center justify-center">
            <Text className="text-sm font-semibold text-indigo-700">Skip</Text>
          </Pressable>
        </View>

        <Text className="mt-4 text-2xl font-extrabold text-slate-900">Invite friends</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Tap a friend to send an invite (they’ll disappear once invited).
        </Text>

        {info ? <Text className="mt-3 text-sm text-slate-700">{info}</Text> : null}

        <ScrollView className="mt-5" contentContainerStyle={{ paddingBottom: 140 }}>
          <View className="gap-3">
            {friends.map((f) => (
              <Pressable
                key={f.id}
                className="rounded-3xl border border-zinc-200 bg-white/70 px-5 py-4"
                onPress={() => inviteOne(f)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-slate-900">
                      {f.first_name} {f.last_name}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-600">{f.email}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color="#4F46E5" />
                </View>
              </Pressable>
            ))}

            {friends.length === 0 ? (
              <View className="rounded-3xl border border-zinc-200 bg-white/70 px-5 py-5">
                <Text className="text-sm text-slate-700">No more friends to invite.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 bg-white/80 border-t border-zinc-200">
          <Pressable
            className="rounded-2xl bg-zinc-900 px-5 py-4"
            onPress={onCreateHang}
            disabled={locking}
          >
            <Text className="text-center text-base font-semibold text-white">
              {locking ? "Creating..." : "Create Hang"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}