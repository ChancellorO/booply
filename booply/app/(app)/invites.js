import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Screen, Title } from "../../components/ui";
import {
  listIncomingGroupInvites,
  acceptGroupInvite,
  declineGroupInvite,
} from "../../constants/db";

export default function Invites() {
  const [invites, setInvites] = useState([]);

  const refresh = async () => {
    try {
      const data = await listIncomingGroupInvites();
      setInvites(data);
    } catch (e) {
      console.log(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Screen>
      <Title>Invites</Title>

      <View className="mt-4 gap-2">
        {invites.map((i) => (
          <View key={i.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <Text className="text-base font-semibold text-zinc-900">Group invite</Text>
            <Text className="mt-1 text-xs text-zinc-500">From: {i.from_user}</Text>
            <Text className="mt-1 text-xs text-zinc-500">Group: {i.group_id}</Text>

            <View className="mt-3 flex-row gap-2">
              <Pressable
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3"
                onPress={async () => {
                  await acceptGroupInvite(i.id);
                  await refresh();
                }}
              >
                <Text className="text-center font-semibold text-white">Accept</Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3"
                onPress={async () => {
                  await declineGroupInvite(i.id);
                  await refresh();
                }}
              >
                <Text className="text-center font-semibold text-zinc-900">Decline</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {invites.length === 0 ? (
          <Text className="text-sm text-zinc-500">No invites</Text>
        ) : null}
      </View>

      <Pressable className="mt-6" onPress={refresh}>
        <Text className="text-center text-sm font-semibold text-zinc-600">Refresh</Text>
      </Pressable>
    </Screen>
  );
}