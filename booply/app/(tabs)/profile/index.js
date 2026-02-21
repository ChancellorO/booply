// app/(tabs)/profile/index.js
import { View, Text } from "react-native";

export default function ProfileTab() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-lg font-semibold">Profile</Text>
      <Text className="text-gray-500 mt-2">Coming soon</Text>
    </View>
  );
}