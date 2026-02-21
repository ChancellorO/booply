import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../../../components/ui";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";

export default function CreateHangName() {
  const [name, setName] = useState("");

  const onNext = () => {
    const trimmed = name.trim() || "New Hang";
    router.push({
      pathname: "/(tabs)/hangs/create/meetup",
      params: { name: trimmed },
    });
  };

  return (
    <Screen>
      <View className="px-6 pt-14">
        <Text className="text-3xl font-extrabold text-slate-900">Create Hang</Text>
        <Text className="mt-2 text-sm text-slate-600">
          Start with a name — you can tweak it later.
        </Text>

        <View className="mt-6 rounded-3xl bg-white/70 px-5 py-5">
          <Text className="text-xs font-semibold text-slate-500">Hang name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Taco Tuesday 🌮"
            placeholderTextColor="#94A3B8"
            className="mt-2 text-lg font-semibold text-slate-900"
          />
        </View>

        <PrimaryButton title="Next" onPress={onNext} className="mt-6" />
      </View>
    </Screen>
  );
}