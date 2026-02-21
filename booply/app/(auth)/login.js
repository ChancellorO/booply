import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../constants/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      router.replace("/(app)");
    } catch (e) {
      setErr(e?.message ?? "Login failed.");
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

        <Text className="mt-2 text-center text-xl font-semibold text-zinc-900">Log in</Text>
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

        <Pressable className="mt-3">
          <Text className="text-xs font-medium text-indigo-600">Forgot password?</Text>
        </Pressable>

        {err ? <Text className="mt-3 text-sm text-red-600">{err}</Text> : null}

        <Pressable
          onPress={onLogin}
          disabled={loading || !email.trim() || !password}
          className={`mt-8 items-center justify-center rounded-xl py-4 ${
            loading || !email.trim() || !password ? "bg-green-300" : "bg-green-500"
          }`}
        >
          <Text className="text-base font-semibold text-white">{loading ? "Logging in..." : "Log in"}</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View className="mt-auto items-center pb-10">
        <Text className="text-xs text-zinc-500">
          New to Booply?{" "}
          <Text className="font-semibold text-indigo-600" onPress={() => router.replace("/(auth)/signup")}>
            Create an account
          </Text>
        </Text>
      </View>
    </View>
  );
}