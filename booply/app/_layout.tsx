// app/_layout.js (or .tsx)
import "react-native-gesture-handler";
import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { registerForPushAndSaveToken } from "../constants/push";

export default function RootLayout() {
  useEffect(() => {
  registerForPushAndSaveToken();
}, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}