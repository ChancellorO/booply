import { View, Text, Pressable, Image} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../constants/supabase";
import { useState } from "react";

export default function Part2() {
  const [loading, setLoading] = useState(false);
  const { arrival } = useLocalSearchParams(); // "early" | "late" | "on_time"

  const isEarly = arrival === "early";
  const isLate = arrival === "late";
  const isOnTime = arrival === "on_time";

  const title = isLate
    ? "How late are you usually?"
    : isEarly
    ? "How early are you usually?"
    : "Nice — you're usually on time";

  const subtitle = isLate
    ? "Pick a typical range so your group can plan realistically."
    : isEarly
    ? "Pick a typical range so your group can plan realistically."
    : "You can change this later in settings.";

  const saveLateRange = async (range) => {
    if (loading) return;
    setLoading(true);

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("No user");

      const payload = {
        late_range: range, // keep this
        // ❌ remove onboarding_completed here
      };


      payload.late_range = range; // "0" | "1-5" | "5-10" | "10-20" | "20+"

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select("arrival_habit, late_range, onboarding_completed")
        .single();

      if (error) throw error;

      console.log("Profile after onboarding part2:", data);

      router.replace("/(onboarding)/part3");
    } catch (e) {
      console.error("Onboarding part2 error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  const ranges = ["1-5", "5-10", "10-20", "20+"];

  return (
    <View className="flex-1 items-center justify-center p-6 bg-white">

        <View className="flex-1 items-center justify-end ">
                  <Image
                    source={require("../../assets/images/sadbooper.png")}
                    className="h-64 w-60 absolute top-1/2 self-center"
                    resizeMode="contain"
                  />
                  <View className="h-48 w-48 rounded-[40px] " /> 
                </View>

      <Text className="text-xl font-bold text-zinc-900">{title}</Text>

      <Text className="mt-2 text-sm text-zinc-500 text-center">{subtitle}</Text>

      <View className="mt-8 w-full">
        {isOnTime ? (
          <Pressable
            className="rounded-2xl bg-zinc-900 p-4"
            onPress={() => saveLateRange("0")}
            disabled={loading}
          >
            <Text className="text-center text-white font-semibold">
              Continue
            </Text>
          </Pressable>
        ) : (
          <View className="gap-4">
            {ranges.map((r) => (
              <Pressable
                key={r}
                className="rounded-2xl bg-zinc-900 p-4"
                onPress={() => saveLateRange(r)}
                disabled={loading}
              >
                <Text className="text-center text-white font-semibold">
                  {r} minutes
                </Text>
              </Pressable>
            ))}

          </View>
        )}
      </View>
    </View>
  );
}