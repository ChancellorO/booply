import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Title } from "../../components/ui";
import { inviteUserToGroup, listMyFriends, listGroupMemberIds, listPendingInviteIds } from "../../constants/db";

export default function AddMembers() {
  const { groupId } = useLocalSearchParams();
  const [friends, setFriends] = useState([]);
  const [info, setInfo] = useState("");

  useEffect(() => {
    (async () => {
      const f = await listMyFriends();
      setFriends(f);
    })();
  }, []);

  useEffect(() => {
    (async () => {
        try {
        const [friends, memberIds, pendingIds] = await Promise.all([
            listMyFriends(),
            listGroupMemberIds(groupId),
            listPendingInviteIds(groupId),
        ]);

        const filtered = friends.filter((f) => !memberIds.has(f.id) && !pendingIds.has(f.id));
        setFriends(filtered);
        } catch (e) {
        console.log(e.message);
        }
    })();
    }, [groupId]);

  return (
    <Screen>
      <Title>Add members</Title>

      <Text className="mt-2 text-sm text-zinc-600">
        Tap a friend to add them to the group.
      </Text>

      <View className="mt-4 gap-2">
        {friends.map((f) => (
          <Pressable
            key={f.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
            onPress={async () => {
              try {
                await inviteUserToGroup(groupId, f.id);
                setInfo(`Invited ${f.first_name} ✅`);
                setFriends((prev) => prev.filter((x) => x.id !== f.id));
                router.back();
              } catch (e) {
                console.log("add member error:", e.message);
              }
            }}
          >
            <Text className="text-base font-semibold text-zinc-900">
              {f.first_name} {f.last_name}
            </Text>
            <Text className="mt-1 text-sm text-zinc-600">{f.email}</Text>
          </Pressable>
        ))}
        {info ? <Text className="mt-3 text-sm text-green-600">{info}</Text> : null}
      </View>
    </Screen>
  );
}