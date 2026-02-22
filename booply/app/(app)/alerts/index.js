import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Screen } from "../../../components/ui";

import {
  listIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  listIncomingGroupInvites,
  acceptGroupInvite,
  declineGroupInvite,
  getUserNameById,
  getGroupNameById,
} from "../../../constants/db";

export default function Alerts() {
  const [groupInvites, setGroupInvites] = useState([]);
  const [friendInvites, setFriendInvites] = useState([]);
  const [loading, setLoading] = useState(false);


  async function refresh() {
    if (loading) return;
    setLoading(true);

    try {
      const [gInvites, fInvites] = await Promise.all([
        listIncomingGroupInvites(),
        listIncomingRequests(),
      ]);

      console.log("Raw group invites:", gInvites);
      console.log("Raw friend invites:", fInvites);

      /*

      const enrichedGroupInvites = await Promise.all(
        (gInvites ?? []).map(async (inv) => {
          const group_name = await getGroupNameById(inv.group_id);
          const from_user_name = await getUserNameById(inv.from_user);

          return { ...inv, group_name, from_user_name };
        })
      );

      const enrichedFriendInvites = await Promise.all(
        (fInvites ?? []).map(async (inv) => {
          const from_user_name = await getUserNameById(inv.from_user);
          return { ...inv, from_user_name };
        })
      );

      console.log("Enriched group invites:", enrichedGroupInvites);
      console.log("Enriched friend invites:", enrichedFriendInvites);
      */

      setGroupInvites(gInvites);
      setFriendInvites(fInvites);
    } catch (e) {
      console.log("Alerts refresh error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onAcceptGroup(inv) {
    try {
      await acceptGroupInvite(inv.id);
      refresh();
    } catch (e) {
      console.log("Accept group invite error:", e?.message ?? e);
    }
  }

  async function onDeclineGroup(inv) {
    try {
      await declineGroupInvite(inv.id);
      refresh();
    } catch (e) {
      console.log("Decline group invite error:", e?.message ?? e);
    }
  }

  async function onAcceptFriend(inv) {
    try {
      await acceptFriendRequest(inv.id);
      refresh();
    } catch (e) {
      console.log("Accept friend request error:", e?.message ?? e);
    }
  }

  async function onRejectFriend(inv) {
    try {
      await rejectFriendRequest(inv.id);
      refresh();
    } catch (e) {
      console.log("Reject friend request error:", e?.message ?? e);
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
              <View key={inv.id} className="mt-4 bg-white/70">
                <Text className="text-lg font-semibold text-slate-900">
                  Group
                </Text>
                <Text className="mt-1 text-sm text-slate-600">
                  You were invited to join a group.
                </Text>

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={() => onAcceptGroup(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-900 py-3"
                  >
                    <Text className="text-sm font-semibold text-white">Accept</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onDeclineGroup(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-200 py-3"
                  >
                    <Text className="text-sm font-semibold text-zinc-900">Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {/* FRIEND REQUESTS */}
          <Text className="mt-10 text-lg font-semibold text-slate-900">Friend requests</Text>
          {friendInvites.length === 0 ? (
            <Text className="mt-3 text-sm text-slate-600">No pending friend requests.</Text>
          ) : (
            friendInvites.map((i) => (
              <View key={i.id} className="mt-4 bg-white/70">
                <Text className="text-lg font-semibold text-slate-900">
                  Friend request
                </Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Someone wants to connect.
                </Text>

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={() => onAcceptFriend(i)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-900 py-3"
                  >
                    <Text className="text-sm font-semibold text-white">Accept</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onRejectFriend(i)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-200 py-3"
                  >
                    <Text className="text-sm font-semibold text-zinc-900">Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Pressable
            onPress={refresh}
            className="mt-10 items-center justify-center rounded-2xl bg-zinc-900 py-3"
          >
            <Text className="text-sm font-semibold text-white">
              {loading ? "Refreshing..." : "Refresh"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}