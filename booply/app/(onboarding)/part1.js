import { View, Text, Pressable, Image } from "react-native";  
import { router } from "expo-router";
import { supabase } from "../../constants/supabase";
import { useState } from "react";

export default function Part1() {
  const [loading, setLoading] = useState(false);

  const saveHabitAndContinue = async (habit) => {
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
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      router.replace({
        pathname: "/(onboarding)/part2",
        params: { arrival: habit },
      });

    } catch (e) {
      console.error("Onboarding part1 error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-end px-6 pb-24 bg-white">

        <View className="flex-1 items-center justify-end ">
                  <Image
                    source={require("../../assets/images/twinboopers.png")}
                    className="h-64 w-60 absolute top-1/2 self-center"
                    resizeMode="contain"
                  />
                  <View className="h-48 w-48 rounded-[40px] " /> 
                </View>


      <Text className="text-xl font-bold text-zinc-900">
        When do you usually arrive?
      </Text>

      <Text className="mt-2 text-sm text-zinc-500 text-center">
        This helps us set better expectations for your group planning.
      </Text>

      <View className="mt-8 w-full gap-4">
        <Pressable
          className="rounded-2xl bg-zinc-900 p-4"
          onPress={() => saveHabitAndContinue("early")}
          disabled={loading}
        >
          <Text className="text-center text-white font-semibold">
            Usually Early
          </Text>
        </Pressable>

        <Pressable
          className="rounded-2xl bg-zinc-900 p-4"
          onPress={() => saveHabitAndContinue("on_time")}
          disabled={loading}
        >
          <Text className="text-center text-white font-semibold">
            Usually On Time
          </Text>
        </Pressable>

        <Pressable
          className="rounded-2xl bg-zinc-900 p-4"
          onPress={() => saveHabitAndContinue("late")}
          disabled={loading}
        >
          <Text className="text-center text-white font-semibold">
            Usually Late
          </Text>
        </Pressable>

       

      </View>
    </View>  // ✅ added missing closing View
  );
}