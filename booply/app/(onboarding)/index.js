import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../constants/supabase"; 
import { useState } from "react";

export default function OnboardingArrival() {
  const [loading, setLoading] = useState(false);

  // move this to db.js later
  const saveHabit = async (habit) => {
    if (loading) return;
    setLoading(true);

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          arrival_habit: habit,
          onboarding_completed: true,
        })
        .eq("id", user.id)
        .select()
        .single();

      console.log("Profile after onboarding:", data, "Error:", error);
      if (error) throw error;

      router.replace("/(tabs)/groups");
    } catch (e) {
      console.error("Onboarding error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-6 bg-white">
      <Text className="text-xl font-bold text-zinc-900">
        When do you usually arrive?
      </Text>

      <Text className="mt-2 text-sm text-zinc-500 text-center">
        This helps us set better expectations for your group planning.
      </Text>

      <View className="mt-8 w-full">
        <View className="gap-4">
          <Pressable
            className="rounded-2xl bg-zinc-900 p-4"
            onPress={() => saveHabit("early")}
            disabled={loading}
          >
            <Text className="text-center text-white font-semibold">
              Usually Early
            </Text>
          </Pressable>

          <Pressable
            className="rounded-2xl bg-zinc-900 p-4"
            onPress={() => saveHabit("on_time")}
            disabled={loading}
          >
            <Text className="text-center text-white font-semibold">
              Usually On Time
            </Text>
          </Pressable>

          <Pressable
            className="rounded-2xl bg-zinc-900 p-4"
            onPress={() => saveHabit("late")}
            disabled={loading}
          >
            <Text className="text-center text-white font-semibold">
              Usually Late
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}