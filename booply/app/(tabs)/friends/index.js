// app/(tabs)/friends/index.js
import { useEffect, useState } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { Input, PrimaryButton, ErrorText } from "../../../components/ui";
import {
  findUserByEmail,
  sendFriendRequest,
  listIncomingRequests,
  acceptFriendRequest,
  listMyFriends,
  getMe,
} from "../../../constants/db";

export default function Friends() {
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#FCFFFE"];

  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [incoming, setIncoming] = useState([]);
  const [friends, setFriends] = useState([]);

  const refresh = async () => {
    try {
      const reqs = await listIncomingRequests();
      setIncoming(reqs);
      const f = await listMyFriends();
      setFriends(f);
    } catch (e) {
      console.log(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAdd = async () => {
    setErr("");
    setInfo("");
    try {
      const me = await getMe();
      const user = await findUserByEmail(email);

      if (!user) throw new Error("No user found with that email.");
      if (user.id === me.id) throw new Error("You can’t add yourself.");

      await sendFriendRequest(user.id);
      setInfo("Friend request sent ✅");
      setEmail("");
      await refresh();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 pt-10 pb-4">
        <View className="flex-row items-center justify-between"></View>
        <Text className="text-3xl font-bold text-gray-900">Friends</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/friends/leaderboard")}
          className="bg-white/80 border border-gray-200 rounded-full px-4 py-2"
        >
          <Text className="text-sm font-semibold text-gray-800">Leaderboard</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140 + insets.bottom,
        }}
        className="flex-1"
      >
        {/* Add Friend Section */}
        <View className="px-4 mt-2">
          <View className="bg-white/80 border border-gray-200 rounded-3xl p-5 shadow-sm">
            <Text className="text-sm font-bold text-blue-900 tracking-wider uppercase mb-3">
              Add Friend
            </Text>

            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="friend@email.com"
            />

            <ErrorText>{err}</ErrorText>

            {info ? (
              <Text className="mt-2 text-sm text-emerald-600">{info}</Text>
            ) : null}

            <View className="mt-4">
              <PrimaryButton
                title="Send request"
                onPress={onAdd}
                disabled={!email.trim()}
              />
            </View>
          </View>
        </View>

        {/* Incoming Requests */}
        <View className="px-4 mt-8">
          <Text className="text-sm font-bold text-blue-900 tracking-wider uppercase mb-3">
            Incoming
          </Text>

          <View className="gap-3">
            {incoming.length === 0 ? (
              <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                <Text className="text-sm text-gray-600">
                  No friend requests yet.
                </Text>
              </View>
            ) : (
              incoming.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={async () => {
                    await acceptFriendRequest(r.id);
                    await refresh();
                  }}
                  className="bg-[#CFEAEC] border border-cyan-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <MaterialIcons
                      name="person-add"
                      size={20}
                      color="#334155"
                    />
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-700">
                        Accept Request
                      </Text>
                      <Text className="text-xs text-gray-500">
                        From: {r.from_user}
                      </Text>
                    </View>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color="#334155"
                  />
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Friends List */}
        <View className="px-4 mt-8 pb-32">
          <Text className="text-sm font-bold text-gray-500 tracking-wider uppercase mb-3">
            Your Friends
          </Text>

          <View className="gap-3">
            {friends.length === 0 ? (
              <View className="bg-white/70 border border-gray-200 rounded-3xl p-5 shadow-sm">
                <Text className="text-sm text-gray-600">
                  No friends yet.
                </Text>
              </View>
            ) : (
              friends.map((f) => (
                <View
                  key={f.id}
                  className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm"
                >
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons
                      name="person"
                      size={20}
                      color="#64748b"
                    />
                    <View>
                      <Text className="text-lg font-bold text-gray-700">
                        {f.first_name} {f.last_name}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {f.email}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}