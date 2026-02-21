import { useEffect, useRef, useState } from "react";
import { Text, View, Pressable } from "react-native";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { Screen, Title } from "../../components/ui";
import { requestLocationPermissions, metersBetween } from "../../constants/location";
import { getLatestMeetup, setMyReadyState } from "../../constants/db";

export default function GeoFence() {
  const { groupId } = useLocalSearchParams();
  const [meetup, setMeetup] = useState(null);
  const [distance, setDistance] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchRef = useRef(null);
  const lastBucketRef = useRef(null);

  const bucketFor = (m) => {
    if (m == null) return null;
    if (m <= 50) return "arrived";
    if (m <= 300) return "close";
    if (m <= 1500) return "en_route";
    return "far";
  };

  useEffect(() => {
    (async () => {
      const place = await getLatestMeetup(groupId);
      setMeetup(place);
    })();
  }, [groupId]);

  const start = async () => {
    if (!meetup) return;
    await requestLocationPermissions();

    setWatching(true);
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 4000, distanceInterval: 15 },
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const target = { lat: meetup.lat, lng: meetup.lng };
        const m = Math.round(metersBetween(here, target));
        setDistance(m);

        const bucket = bucketFor(m);
        if (bucket && bucket !== lastBucketRef.current) {
          lastBucketRef.current = bucket;
          try {
            await setMyReadyState(groupId, bucket);
            console.log("ready_state ->", bucket);
          } catch (e) {
            console.log("failed to update ready_state:", e.message);
          }
        }
      }
    );
  };

  const stop = async () => {
    setWatching(false);
    watchRef.current?.remove?.();
    watchRef.current = null;
  };

  useEffect(() => () => stop(), []);

  return (
    <Screen>
      <Title>Tracking</Title>

      <View className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <Text className="text-sm text-zinc-500">Meetup</Text>
        <Text className="mt-1 text-base font-semibold text-zinc-900">
          {meetup ? `${meetup.name} (${meetup.radius_m}m)` : "Not set"}
        </Text>
      </View>

      <View className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <Text className="text-sm text-zinc-500">Distance</Text>
        <Text className="mt-1 text-3xl font-semibold text-zinc-900">
          {distance == null ? "—" : `${distance} m`}
        </Text>
      </View>

      {!watching ? (
        <Pressable
          className={`mt-6 rounded-2xl px-5 py-4 ${meetup ? "bg-zinc-900" : "bg-zinc-300"}`}
          disabled={!meetup}
          onPress={start}
        >
          <Text className="text-center text-base font-semibold text-white">Start</Text>
        </Pressable>
      ) : (
        <Pressable className="mt-6 rounded-2xl bg-zinc-900 px-5 py-4" onPress={stop}>
          <Text className="text-center text-base font-semibold text-white">Stop</Text>
        </Pressable>
      )}
    </Screen>
  );
}