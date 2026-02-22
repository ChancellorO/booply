import { useState } from "react";
import { View, RNText, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../constants/supabase";
<<<<<<< Updated upstream
import { setRandomScore } from "../../constants/db";
=======
import Text from "@components/ui/Text";
>>>>>>> Stashed changes

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accept, setAccept] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignup = async () => {
    if (loading) return;
    setErr("");

    if (!accept) {
      setErr("Please accept the Terms of Use & Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const e = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
      });
      if (error) throw error;

      // Hackathon-friendly:
      // If email confirmation is ON, user may need to log in after confirming.
      // You can route to login and show a message.
      await setRandomScore(data.user.id); // set random punctuality score for demo purposes
      router.replace("/(auth)/login");
    } catch (e) {
      setErr(e?.message ?? "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-14">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>

        <Text className="mt-2 text-center text-xl font-semibold text-zinc-900">Sign up</Text>
      </View>

      {/* Form */}
      <View className="px-7 pt-8">
        <Text className="text-xs font-medium text-zinc-400">Email Address</Text>
        <View className="mt-2 rounded-xl bg-zinc-100 px-4 py-3">
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email address"
            placeholderTextColor="#A1A1AA"
            className="text-base text-zinc-900"
          />
        </View>

        <Text className="mt-5 text-xs font-medium text-zinc-400">Password</Text>
        <View className="mt-2 flex-row items-center rounded-xl bg-zinc-100 px-4 py-3">
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            placeholder="Enter your password"
            placeholderTextColor="#A1A1AA"
            className="flex-1 text-base text-zinc-900"
          />
          <Pressable onPress={() => setShowPw((v) => !v)} className="pl-3">
            <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color="#71717A" />
          </Pressable>
        </View>

        <Text className="mt-2 text-xs text-zinc-400">
          At least 8 characters with uppercase letters and numbers
        </Text>

        {/* Terms row */}
        <Pressable
          onPress={() => setAccept((v) => !v)}
          className="mt-4 flex-row items-center"
        >
          <View
            className={`h-4 w-4 items-center justify-center rounded border ${
              accept ? "border-indigo-600 bg-indigo-600" : "border-zinc-300 bg-white"
            }`}
          >
            {accept ? <Ionicons name="checkmark" size={12} color="white" /> : null}
          </View>

          <Text className="ml-3 text-xs text-zinc-400">
            Accept{" "}
            <Text className="text-indigo-600">Terms of Use</Text> &{" "}
            <Text className="text-indigo-600">Privacy Policy</Text>
          </Text>
        </Pressable>

        {err ? <Text className="mt-3 text-sm text-red-600">{err}</Text> : null}

        <Pressable
          onPress={onSignup}
          disabled={loading || !email.trim() || !password}
          className={`mt-8 items-center justify-center rounded-xl py-4 ${
            loading || !email.trim() || !password ? "bg-green-300" : "bg-green-500"
          }`}
        >
          <Text className="text-base font-semibold text-white">{loading ? "Creating..." : "Sign up"}</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View className="mt-auto items-center pb-10">
        <Text className="text-xs text-zinc-500">
          Already have an account?{" "}
          <Text className="font-semibold text-indigo-600" onPress={() => router.replace("/(auth)/login")}>
            Log in!
          </Text>
        </Text>
      </View>
    </View>
  );
}