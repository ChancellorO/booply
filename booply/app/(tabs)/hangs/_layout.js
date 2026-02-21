import { Stack } from "expo-router";

export default function HangsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      {/* create wizard */}
      <Stack.Screen name="create/place" />
      <Stack.Screen name="create/time" />
      <Stack.Screen name="create/invite" />

      {/* existing hang */}
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/invite" />
    </Stack>
  );
}