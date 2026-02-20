import { useState } from 'react';
import { View, Text, Pressable } from "react-native";
import { supabase } from '../../constants/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const signIn = async () => {
    setMsg('Sending code...');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMsg(error ? error.message : 'Check your email for the login link/code.');
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold">Booply</Text>
      <Text className="mt-2 text-base text-zinc-500">NativeWind is working ✅</Text>

      <Pressable className="mt-6 rounded-2xl bg-black px-5 py-3">
        <Text className="text-white font-semibold">Continue</Text>
      </Pressable>
    </View>
  );
}