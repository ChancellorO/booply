import { Pressable, Text } from "react-native";

export function PrimaryButton({ title, onPress, disabled, className = "" }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center rounded-2xl py-4 ${
        disabled ? "bg-zinc-300" : "bg-zinc-900"
      } ${className}`}
      style={{
        shadowColor: "#000",
        shadowOpacity: disabled ? 0 : 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: disabled ? 0 : 8,
      }}
    >
      <Text className="text-lg font-semibold text-white">{title}</Text>
    </Pressable>
  );
}