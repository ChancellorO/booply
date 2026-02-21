import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Screen, Card } from "../../../components/ui";
import { supabase } from "../../../constants/supabase";
import {
  listIncomingRequests,
  acceptFriendRequest,
  // add this if you have it
  // rejectFriendRequest,
} from "../../../constants/db"; // <-- your import path was likely wrong

export default function Alerts() {
  const [groupInvites, setGroupInvites] = useState([]);
  const [friendInvites, setFriendInvites] = useState([]);

  async function refresh() {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.log(userErr.message);
    const me = userData?.user;
    if (!me?.id) return;

    // 1) group invites
    const g = await supabase
      .from("group_invites")
      .select("id,group_id,from_user,status,created_at, groups(name)")
      .eq("to_user", me.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (g.error) {
      console.log("Group invites error:", g.error.message);
    } else {
      setGroupInvites(g.data ?? []);
    }

    // 2) friend requests
    try {
      const incoming = await listIncomingRequests(); // expected array
      setFriendInvites(incoming ?? []);
    } catch (e) {
      console.log("Friend invites error:", e?.message ?? e);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // --- group accept/reject
  async function acceptGroupInvite(inv) {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData?.user;
    if (!me?.id) return;

    await supabase.from("group_invites").update({ status: "accepted" }).eq("id", inv.id);

    const ins = await supabase
      .from("group_members")
      .insert({ group_id: inv.group_id, user_id: me.id, role: "member", status: "active" });

    if (ins.error && ins.error.code !== "23505") console.log(ins.error);

    refresh();
  }

  async function rejectGroupInvite(inv) {
    await supabase.from("group_invites").update({ status: "rejected" }).eq("id", inv.id);
    refresh();
  }

  // --- friend accept/reject
  async function acceptFriend(inv) {
    try {
      // depending on your helper signature:
      // await acceptFriendRequest(inv.id)
      await acceptFriendRequest(inv);
      refresh();
    } catch (e) {
      console.log("Accept friend error:", e?.message ?? e);
    }
  }

  async function rejectFriend(inv) {
    try {
      // you NEED a DB helper or supabase query for this.
      // Example if you have a table "friend_requests":
      // await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", inv.id);

      console.log("TODO: implement rejectFriendRequest");
      refresh();
    } catch (e) {
      console.log("Reject friend error:", e?.message ?? e);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pt-14">
          <Text className="text-3xl font-extrabold text-slate-900">Alerts</Text>
          <Text className="mt-2 text-sm text-slate-600">Invites & updates.</Text>

          {/* GROUP INVITES */}
          <Text className="mt-8 text-lg font-semibold text-slate-900">Group invites</Text>

          {groupInvites.length === 0 ? (
            <Text className="mt-3 text-sm text-slate-600">No pending group invites.</Text>
          ) : (
            groupInvites.map((inv) => (
              <Card key={inv.id} className="mt-4 bg-white/70">
                <Text className="text-lg font-semibold text-slate-900">
                  {inv.groups?.name ?? "Group invite"}
                </Text>
                <Text className="mt-1 text-sm text-slate-600">You were invited to join.</Text>

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={() => acceptGroupInvite(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-900 py-3"
                  >
                    <Text className="text-sm font-semibold text-white">Accept</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => rejectGroupInvite(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-200 py-3"
                  >
                    <Text className="text-sm font-semibold text-zinc-900">Reject</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}

          {/* FRIEND REQUESTS */}
          <Text className="mt-10 text-lg font-semibold text-slate-900">Friend requests</Text>

          {friendInvites.length === 0 ? (
            <Text className="mt-3 text-sm text-slate-600">No pending friend requests.</Text>
          ) : (
            friendInvites.map((inv) => (
              <Card key={inv.id} className="mt-4 bg-white/70">
                <Text className="text-lg font-semibold text-slate-900">
                  {inv.from_name ?? inv.from_email ?? "Friend request"}
                </Text>
                <Text className="mt-1 text-sm text-slate-600">Wants to connect.</Text>

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={() => acceptFriend(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-900 py-3"
                  >
                    <Text className="text-sm font-semibold text-white">Accept</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => rejectFriend(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-200 py-3"
                  >
                    <Text className="text-sm font-semibold text-zinc-900">Reject</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}

          {/* optional refresh button */}
          <Pressable
            onPress={refresh}
            className="mt-10 items-center justify-center rounded-2xl bg-zinc-900 py-3"
          >
            <Text className="text-sm font-semibold text-white">Refresh</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}