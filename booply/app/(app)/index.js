import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { supabase } from "../../constants/supabase";
import { Screen, Title } from "../../components/ui";

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
    </Screen>
  );
}