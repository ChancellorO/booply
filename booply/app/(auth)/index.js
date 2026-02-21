import { View, Text, Pressable, Image } from "react-native";
import { router } from "expo-router";

export default function AuthLanding() {
  return (
    <View className="flex-1 bg-white">
      {/* Top illustration area */}
      <View className="flex-1 items-center justify-center px-8">
        {/* Replace with your own image */}
        {/* <Image source={require("../../assets/onboarding.png")} className="h-72 w-72" resizeMode="contain" /> */}
        <View className="h-72 w-72 rounded-3xl bg-zinc-50" />
      </View>

      {/* Bottom content */}
      <View className="px-7 pb-10">
        <Text className="text-4xl font-extrabold text-zinc-900">Alarm</Text>

        <View className="mt-6 flex-row gap-4">
          {/* Sign up (outlined) */}
          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            className="flex-1 items-center justify-center rounded-xl border-2 border-indigo-600 bg-white py-3"
          >
            <Text className="text-base font-semibold text-indigo-600">Sign up</Text>
          </Pressable>

          {/* Log in (filled) */}
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="flex-1 items-center justify-center rounded-xl bg-indigo-700 py-3"
          >
            <Text className="text-base font-semibold text-white">Log in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}