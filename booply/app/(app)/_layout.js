import { Stack } from "expo-router";

export default function AppLayout() {
  console.log("USING (app) layout");
  return <Stack screenOptions={{ headerShown: false }} />;
}