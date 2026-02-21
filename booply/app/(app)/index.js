import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Screen, Title } from "../../components/ui";
import { supabase } from "../../constants/supabase";

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      setEmail(user?.email ?? "");

      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name,last_name,description,preferences")
        .eq("id", user.id)
        .single();

      if (!error) setProfile(data);
    })();
  }, []);

  return (
    <Screen>
      <Title>Home</Title>

      <View className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <Text className="text-sm text-zinc-500">Signed in as</Text>
        <Text className="mt-1 text-base font-semibold text-zinc-900">{email || "(no email)"}</Text>
      </View>

      <View className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <Text className="text-sm text-zinc-500">Profile</Text>
        <Text className="mt-2 text-base font-semibold text-zinc-900">
          {profile ? `${profile.first_name} ${profile.last_name}` : "Loading..."}
        </Text>
        <Text className="mt-1 text-sm text-zinc-700">
          {profile?.description || "(no description yet)"}
        </Text>
      </View>

      <Pressable
        className="mt-8 rounded-2xl bg-zinc-900 px-5 py-4"
        onPress={async () => {
          await supabase.auth.signOut();
        }}
      >
        <Text className="text-center text-base font-semibold text-white">Sign out</Text>
      </Pressable>
      <Pressable
        className="mt-4 rounded-2xl bg-zinc-900 px-5 py-4"
        onPress={async () => {
          const g = await supabase
            .from("groups")
            .insert({ name: "RLS Test" })
            .select()
            .single();

          console.log("create group:", g);
          if (g.error) console.log("group error:", g.error.message);

          if (g.error || !g.data?.id) return;

          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;

          const m = await supabase
            .from("group_members")
            .insert({ group_id: g.data.id, user_id: user.id })
            .select()
            .single();

          console.log("add member:", m);

          const s = await supabase.from("groups").select("*");
          console.log("select groups after member:", s);
        }}
      >
        <Text className="text-center text-base font-semibold text-white">Test RLS</Text>
      </Pressable>
      <Pressable
        className="mt-4 rounded-2xl border border-zinc-200 px-5 py-4"
        onPress={() => router.push("/(app)/groups")}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">Groups</Text>
      </Pressable>
      <Pressable
        className="mt-4 rounded-2xl border border-zinc-200 px-5 py-4"
        onPress={() => router.push("/(app)/friends")}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">Friends</Text>
      </Pressable>
      <Pressable
        className="mt-3 rounded-2xl border border-zinc-200 px-5 py-4"
        onPress={() => router.push("/(app)/invites")}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">Invites</Text>
      </Pressable>
      <Pressable
        className="mt-3 rounded-2xl border border-zinc-200 px-5 py-4"
        onPress={() => router.push("/(tabs)/events")}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">Events</Text>
      </Pressable>

      <Pressable
        className="mt-3 rounded-2xl border border-zinc-200 px-5 py-4"
        onPress={() => router.push("/(app)/leaderboard")}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">Leaderboard</Text>
      </Pressable>
      
    </Screen>
  );
}