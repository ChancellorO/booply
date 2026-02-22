import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#FCFFFE"];

  const [groupInvites, setGroupInvites] = useState([]);
  const [friendInvites, setFriendInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("groups");

  async function refresh() {
    if (loading) return;
    setLoading(true);

    try {
      const [gInvites, fInvites] = await Promise.all([
        listIncomingGroupInvites(),
        listIncomingRequests(),
      ]);

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
    await acceptGroupInvite(inv.id);
    refresh();
  }

  async function onDeclineGroup(inv) {
    await declineGroupInvite(inv.id);
    refresh();
  }

  async function onAcceptFriend(inv) {
    await acceptFriendRequest(inv.id);
    refresh();
  }

  async function onRejectFriend(inv) {
    await rejectFriendRequest(inv.id);
    refresh();
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View className="px-4 pt-10 pb-4">
          <Text className="text-3xl font-bold text-gray-900">Alerts</Text>
          <Text className="mt-2 text-sm text-gray-600">
            Invites & updates
          </Text>
        </View>

        <View className="px-4">

          {/* TOGGLE */}
          <View className="mt-4 flex-row rounded-3xl bg-white/70 border border-gray-200 p-1 shadow-sm">
            <Pressable
              onPress={() => setSelectedTab("groups")}
              className={`flex-1 items-center justify-center rounded-3xl py-3 ${
                selectedTab === "groups"
                  ? "bg-[#CFEAEC] border border-cyan-200"
                  : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedTab === "groups"
                    ? "text-gray-900"
                    : "text-gray-500"
                }`}
              >
                Group Invites
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedTab("friends")}
              className={`flex-1 items-center justify-center rounded-3xl py-3 ${
                selectedTab === "friends"
                  ? "bg-[#CFEAEC] border border-cyan-200"
                  : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedTab === "friends"
                    ? "text-gray-900"
                    : "text-gray-500"
                }`}
              >
                Friend Requests
              </Text>
            </Pressable>
          </View>

          {/* GROUP INVITES */}
          {selectedTab === "groups" && (
            <>
              <Text className="mt-8 text-sm font-bold text-blue-900 tracking-wider uppercase">
                Group Invites
              </Text>

              <View className="mt-3 gap-3">
                {groupInvites.length === 0 ? (
                  <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                    <Text className="text-sm text-gray-600">
                      No pending group invites.
                    </Text>
                  </View>
                ) : (
                  groupInvites.map((inv) => (
                    <View
                      key={inv.id}
                      className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm"
                    >
                      <View className="flex-row items-center gap-3">
                        <MaterialIcons
                          name="groups"
                          size={20}
                          color="#334155"
                        />
                        <View>
                          <Text className="text-lg font-bold text-gray-700">
                            Group Invite
                          </Text>
                          <Text className="text-sm text-gray-500">
                            You were invited to join a group.
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row gap-3">
                        <Pressable
                          onPress={() => onAcceptGroup(inv)}
                          className="flex-1 items-center justify-center rounded-2xl bg-[#CFEAEC] border border-cyan-200 py-3"
                        >
                          <Text className="text-sm font-semibold text-gray-900">
                            Accept
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => onDeclineGroup(inv)}
                          className="flex-1 items-center justify-center rounded-2xl bg-gray-200 py-3"
                        >
                          <Text className="text-sm font-semibold text-gray-700">
                            Decline
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* FRIEND REQUESTS */}
          {selectedTab === "friends" && (
            <>
              <Text className="mt-8 text-sm font-bold text-blue-900 tracking-wider uppercase">
                Friend Requests
              </Text>

              <View className="mt-3 gap-3">
                {friendInvites.length === 0 ? (
                  <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                    <Text className="text-sm text-gray-600">
                      No pending friend requests.
                    </Text>
                  </View>
                ) : (
                  friendInvites.map((inv) => (
                    <View
                      key={inv.id}
                      className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm"
                    >
                      <View className="flex-row items-center gap-3">
                        <MaterialIcons
                          name="person-add"
                          size={20}
                          color="#334155"
                        />
                        <View>
                          <Text className="text-lg font-bold text-gray-700">
                            Friend Request
                          </Text>
                          <Text className="text-sm text-gray-500">
                            Someone wants to connect.
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row gap-3">
                        <Pressable
                          onPress={() => onAcceptFriend(inv)}
                          className="flex-1 items-center justify-center rounded-2xl bg-[#CFEAEC] border border-cyan-200 py-3"
                        >
                          <Text className="text-sm font-semibold text-gray-900">
                            Accept
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => onRejectFriend(inv)}
                          className="flex-1 items-center justify-center rounded-2xl bg-gray-200 py-3"
                        >
                          <Text className="text-sm font-semibold text-gray-700">
                            Reject
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          <Pressable
            onPress={refresh}
            className="mt-10 items-center justify-center rounded-3xl bg-gray-900 py-4 shadow-sm"
          >
            <Text className="text-sm font-semibold text-white">
              {loading ? "Refreshing..." : "Refresh"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}