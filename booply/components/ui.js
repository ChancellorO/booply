import { Text, TextInput, Pressable, View } from "react-native";

export function Screen({ children }) {
  return <View className="flex-1 bg-white px-6 pt-16">{children}</View>;
}

export function Title({ children }) {
  return <Text className="text-3xl font-bold tracking-tight text-zinc-900">{children}</Text>;
}

export function Label({ children }) {
  return <Text className="text-sm font-medium text-zinc-700">{children}</Text>;
}

export function Input(props) {
  return (
    <TextInput
      className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900"
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}

export function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mt-4 rounded-2xl px-5 py-4 ${disabled ? "bg-zinc-300" : "bg-zinc-900"}`}
    >
      <Text className="text-center text-base font-semibold text-white">{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }) {
  return (
    <Pressable onPress={onPress} className="mt-3 rounded-2xl border border-zinc-200 px-5 py-4">
      <Text className="text-center text-base font-semibold text-zinc-900">{title}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <Text className="mt-3 text-sm text-red-600">{children}</Text>;
}