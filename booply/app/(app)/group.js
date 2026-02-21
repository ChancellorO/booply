import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Title } from "../../components/ui";
import { getLatestMeetup, listGroupMembers } from "../../constants/db";

const prettyState = (s) => {
  if (!s) return "—";
  if (s === "getting_ready") return "Getting ready";
  if (s === "far") return "Far";
  if (s === "en_route") return "En route";
  if (s === "close") return "Close";
  if (s === "arrived") return "Arrived";
  return s;
};

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams();
  const [members, setMembers] = useState([]);
  const [meetup, setMeetup] = useState(null);

  const refresh = async () => {
    try {
      const m = await listGroupMembers(groupId);
      setMembers(m);
      const place = await getLatestMeetup(groupId);
      setMeetup(place);
    } catch (e) {
      console.log(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, [groupId]);

  return (
    <Screen>
      <Title>Group</Title>

      <View className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <Text className="text-sm text-zinc-500">Meetup</Text>
        <Text className="mt-1 text-base font-semibold text-zinc-900">
          {meetup ? `${meetup.name} (${meetup.radius_m}m)` : "Not set"}
        </Text>
      </View>

      <Pressable
        className="mt-4 rounded-2xl border border-zinc-200 px-5 py-4"
        onPress={() => router.push({ pathname: "/(app)/pick-meetup", params: { groupId } })}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">Set meetup</Text>
      </Pressable>

      <Pressable
        className={`mt-3 rounded-2xl px-5 py-4 ${meetup ? "bg-zinc-900" : "bg-zinc-300"}`}
        disabled={!meetup}
        onPress={() => router.push({ pathname: "/(app)/geofence", params: { groupId } })}
      >
        <Text className="text-center text-base font-semibold text-white">Start geo tracking</Text>
      </Pressable>

      <Text className="mt-8 text-sm font-semibold text-zinc-700">Members</Text>
      <View className="mt-3 gap-2">
        {members.map((m) => {
          const name = m.profiles ? `${m.profiles.first_name} ${m.profiles.last_name}` : m.user_id;
          return (
            <View key={m.user_id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <Text className="text-base font-semibold text-zinc-900">{name}</Text>
              <Text className="mt-1 text-sm text-zinc-600">{prettyState(m.ready_state)}</Text>
            </View>
          );
        })}
      </View>

      <Pressable className="mt-6" onPress={refresh}>
        <Text className="text-center text-sm font-semibold text-zinc-600">Refresh</Text>
      </Pressable>
    </Screen>
  );
}