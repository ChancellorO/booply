// app/(tabs)/friends/index.js  (DROP-IN REPLACEMENT)

import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, ScrollView, Image } from "react-native";
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
import { supabase } from "../../../constants/supabase";

const fallbackAvatar = require("../../../assets/images/dumbways.png");

function Avatar({ uri, size = 42 }) {
  return (
    <Image
      source={uri ? { uri } : fallbackAvatar}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.6)",
      }}
    />
  );
}

export default function Friends() {
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#FCFFFE"];

  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [incomingRaw, setIncomingRaw] = useState([]); // original rows
  const [friendsRaw, setFriendsRaw] = useState([]); // original rows

  const [profilesById, setProfilesById] = useState({}); // { [userId]: { first_name, last_name, email, avatar_url } }

  const refresh = async () => {
    try {
      const reqs = await listIncomingRequests();
      const f = await listMyFriends();

      setIncomingRaw(reqs || []);
      setFriendsRaw(f || []);

      // Build a set of all user IDs we need avatars for.
      const ids = new Set();

      // incoming requests: your db function likely returns from_user as an id (or email).
      // We'll treat it as an id if it looks like a uuid-ish string.
      for (const r of reqs || []) {
        if (typeof r?.from_user === "string" && r.from_user.length >= 8) ids.add(r.from_user);
      }

      // friends: these are profiles already in many setups, but we’ll still enrich if needed
      for (const fr of f || []) {
        if (typeof fr?.id === "string") ids.add(fr.id);
      }

      if (ids.size === 0) {
        setProfilesById({});
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, avatar_url")
        .in("id", Array.from(ids));

      if (error) {
        console.log("profiles fetch err:", error.message);
        return;
      }

      const map = {};
      for (const p of data || []) map[p.id] = p;
      setProfilesById(map);
    } catch (e) {
      console.log(e?.message ?? e);
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
      setErr(e?.message ?? String(e));
    }
  };

  const incoming = useMemo(() => {
    return (incomingRaw || []).map((r) => {
      const p = profilesById?.[r?.from_user];
      const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : null;
      return {
        ...r,
        _fromProfile: p || null,
        _fromName: name || r?.from_user || "Unknown",
      };
    });
  }, [incomingRaw, profilesById]);

  const friends = useMemo(() => {
    return (friendsRaw || []).map((f) => {
      // if your listMyFriends already returns avatar_url, keep it; otherwise prefer profilesById
      const p = profilesById?.[f?.id] || null;
      return {
        ...f,
        avatar_url: f?.avatar_url ?? p?.avatar_url ?? null,
        first_name: f?.first_name ?? p?.first_name ?? "",
        last_name: f?.last_name ?? p?.last_name ?? "",
        email: f?.email ?? p?.email ?? "",
      };
    });
  }, [friendsRaw, profilesById]);

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
          <Text className="text-3xl font-bold text-gray-900">Friends</Text>

          <Pressable
            onPress={() => router.push("/(tabs)/friends/leaderboard")}
            className="flex-row items-center gap-2 bg-white/70 border border-white/60 rounded-full px-4 py-2"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <MaterialIcons name="emoji-events" size={18} color="#0f766e" />
            <Text className="text-sm font-semibold text-gray-800">Leaderboard</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
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

            {info ? <Text className="mt-2 text-sm text-emerald-600">{info}</Text> : null}

            <View className="mt-4">
              <PrimaryButton title="Send request" onPress={onAdd} disabled={!email.trim()} />
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
                <Text className="text-sm text-gray-600">No friend requests yet.</Text>
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
                    <Avatar uri={r?._fromProfile?.avatar_url} size={44} />
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-700">Accept Request</Text>
                      <Text className="text-xs text-gray-500">From: {r?._fromName}</Text>
                    </View>
                  </View>

                  <MaterialIcons name="chevron-right" size={22} color="#334155" />
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
                <Text className="text-sm text-gray-600">No friends yet.</Text>
              </View>
            ) : (
              friends.map((f) => (
                <View
                  key={f.id}
                  className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm"
                >
                  <View className="flex-row items-center gap-3">
                    <Avatar uri={f.avatar_url} size={44} />
                    <View>
                      <Text className="text-lg font-bold text-gray-700">
                        {f.first_name} {f.last_name}
                      </Text>
                      <Text className="text-sm text-gray-500">{f.email}</Text>
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