import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { supabase } from "../../constants/supabase";
import { Screen, Title } from "../../components/ui";
import { useRouter } from "expo-router";
import { useProfile } from "../../context/ProfileContext";


export default function Home() {
  const router = useRouter();
  const { profile, email, loading } = useProfile();
  console.log("Profile data:", profile, "Email:", email, "Loading:", loading);
  

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
          router.replace("/(auth)");
        }}
      >
        <Text className="text-center text-base font-semibold text-white">Sign out</Text>
      </Pressable>
      
      <Pressable
        className="mt-4 rounded-2xl bg-zinc-900 px-5 py-4"
        onPress={() => router.push("/calendar")}
      >
        <Text className="text-center text-base font-semibold text-white">
          Google Calendar API
        </Text>
      </Pressable>


    </Screen>
  );
}