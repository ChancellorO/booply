import { View, Text, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function Landing() {
  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={["#CFEFFF", "#FFFFFF", "#DFF6E7"]}
        locations={[0, 0.62, 1]}
        start={{ x: 0.05, y: 0.05 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View
        className="absolute -left-24 -top-28 h-96 w-96 rounded-full"
        style={{ backgroundColor: "rgba(120, 210, 255, 0.25)" }}
      />
      <View
        className="absolute -right-28 bottom-0 h-96 w-96 rounded-full"
        style={{ backgroundColor: "rgba(120, 255, 190, 0.18)" }}
      />
      <View className="flex-1 items-center justify-end px-8 pb-20">
        <Image source={require("../../assets/images/onboarding.png")} className="h-56 w-56" resizeMode="contain" />
        <View className="h-56 w-56 rounded-[40px] bg-white/40" />

        <Text className="mt-10 text-6xl font-extrabold tracking-tight text-black">booply</Text>
        <Text className="mt-3 text-lg text-black/80">None of us will be late.</Text>

        <Pressable
          onPress={() => router.push("/(auth)/login")} // change to login/signup route you want
          className="mt-10 w-full max-w-sm items-center justify-center rounded-xl bg-zinc-900 py-5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <Text className="text-2xl font-medium text-white">Login</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(auth)/signup")} // change to login/signup route you want
          className="mt-10 w-full max-w-sm items-center justify-center rounded-xl bg-zinc-900 py-5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <Text className="text-2xl font-medium text-white">Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}