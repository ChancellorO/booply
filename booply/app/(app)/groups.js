import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";
import { createGroup, listMyGroups } from "../../constants/db";

export default function Groups() {
  const [name, setName] = useState("");
  const [groups, setGroups] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const g = await listMyGroups();
      setGroups(g);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCreate = async () => {
    setErr("");
    setLoading(true);
    try {
      const group = await createGroup(name);
      setName("");
      await refresh();
      router.push({ pathname: "/(app)/group", params: { groupId: group.id } });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Groups</Title>

      <Label>Create a group</Label>
      <Input value={name} onChangeText={setName} placeholder="Friday night" />

      <ErrorText>{err}</ErrorText>

      <PrimaryButton
        title={loading ? "Creating..." : "Create"}
        onPress={onCreate}
        disabled={loading || !name.trim()}
      />

      <View className="mt-8">
        <Text className="text-sm font-semibold text-zinc-700">Your groups</Text>
        <View className="mt-3 gap-2">
          {groups.map((g) => (
            <Pressable
              key={g.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
              onPress={() => router.push({ pathname: "/(app)/group", params: { groupId: g.id } })}
            >
              <Text className="text-base font-semibold text-zinc-900">{g.name}</Text>
              <Text className="mt-1 text-xs text-zinc-500">{g.id}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}