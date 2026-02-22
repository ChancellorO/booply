import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, LayoutAnimation, Platform, UIManager } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listMyFriends, listGroupMemberIds, listPendingInviteIds, inviteUserToGroup } from "../../../../constants/db";
import { supabase } from "../../../../constants/supabase";

export default function CreateHangInvite() {
  const { groupId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#FCFFFE"];
  const cardBlue = "#F3FBFC";
  const outsideLabel = "px-1 text-sm font-extrabold tracking-widest uppercase text-gray-700";
  const TAB_BAR_HEIGHT = 12; 

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
      setInfo(`Invited ${friend.first_name} ${friend.first_name}`);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  return (
    <LinearGradient
    colors={gradientColors}
    start={{ x: 0.15, y: 0 }}
    end={{ x: 1, y: 0.85 }}
    style={{ flex: 1, paddingTop: insets.top }}
    >
      <View className="px-4 pt-10 pb-4">

        {/* Header*/}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm"
          >
            <MaterialIcons name="arrow-back" size={22} color="#374151" />
          </Pressable>

          <Text className="text-2xl font-bold text-gray-900">Invite friends</Text>

          <Pressable
            onPress={onCreateHang}
            disabled={locking}
            className="bg-white border border-gray-300 rounded-full px-4 h-12 items-center justify-center shadow-sm"
          >
            <Text className="text-sm font-bold text-gray-700">
              {locking ? "..." : "Skip"}
            </Text>
          </Pressable>
        </View>

      </View>

      <View className="flex-1 px-4">
        <Text className={outsideLabel}>Who’s coming</Text>

        <View
          className="mt-2 rounded-3xl p-5 shadow-sm border border-white/60"
          style={{ backgroundColor: cardBlue }}
        >
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 rounded-2xl bg-white/80 items-center justify-center border border-white/60">
              <MaterialIcons name="person-add" size={20} color="#334155" />
            </View>

            <View style={{ flex: 1 }}>
              <Text className="text-base font-semibold text-gray-800">
                Tap a friend to invite
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                They’ll disappear once invited.
              </Text>

              {info ? (
                <View className="mt-3 bg-white/70 border border-white/60 rounded-2xl px-3 py-2">
                  <Text className="text-sm font-semibold text-gray-700">{info}</Text>
                </View>
              ) : null}
            </View>
          </View>
         </View>

        <ScrollView
          className="mt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 220 }}
        >

        <View className="gap-3">
          {friends.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => inviteOne(f)}
              className="rounded-3xl p-5 shadow-sm border border-white/60"
              style={{ backgroundColor: cardBlue }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-bold text-gray-700">
                    {f.first_name} {f.last_name}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500">{f.email}</Text>
                </View>

                <View className="h-10 w-10 rounded-2xl bg-white/80 items-center justify-center border border-white/60">
                  <MaterialIcons name="add" size={20} color="#2f6f57" />
                </View>
              </View>
            </Pressable>
          ))}

          {friends.length === 0 ? (
            <View
              className="rounded-3xl p-5 shadow-sm border border-white/60"
              style={{ backgroundColor: cardBlue }}
            >
              <Text className="text-sm font-semibold text-gray-700">
                No more friends to invite.
              </Text>
              <Text className="mt-1 text-xs text-gray-600">
                You can still create the hang.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>

      <View
        className="absolute left-0 right-0 px-4 pt-4"
        style={{
          bottom: TAB_BAR_HEIGHT,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={onCreateHang}
          disabled={locking}
          className={`rounded-2xl px-5 py-3.5 border ${
            locking ? "bg-gray-200 border-gray-300" : "bg-white border-emerald-300"
          }`}
        >
          <Text
            className={`text-center text-base font-bold ${
              locking ? "text-gray-500" : "text-emerald-700"
            }`}
          >
            {locking ? "Creating..." : "Create Hang"}
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}