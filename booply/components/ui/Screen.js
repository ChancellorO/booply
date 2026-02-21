import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function Screen({ children }) {
  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={["#9BD6B2", "#FFFFFF", "#DFF6E7"]}
        locations={[0, 0.6, 1]}
        start={{ x: 0.05, y: 0.05 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View className="flex-1">{children}</View>
    </View>
  );
}