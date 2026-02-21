import { View } from "react-native";

export function Card({ children, className = "" }) {
  return <View className={`rounded-3xl px-5 py-4 ${className}`}>{children}</View>;
}