import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase } from "../constants/supabase";
import { ProfileProvider } from "@/context/ProfileContext";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let isMounted = true;

    const guard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      const inAuthGroup = segments[0] === "(auth)";
      const signedIn = !!session;

      if (signedIn && inAuthGroup) router.replace("/(app)");
      if (!signedIn && !inAuthGroup) router.replace("/(auth)");
    };

    guard();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      guard();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [segments, router]);

  return (
    <ProfileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  );
};