import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useLocalSearchParams, router } from "expo-router";
import { Screen, Title } from "../../components/ui";
import { saveMeetup } from "../../constants/db";

export default function PickMeetup() {
  const { groupId } = useLocalSearchParams();

  const [initialRegion, setInitialRegion] = useState(null);
  const [picked, setPicked] = useState(null); // { lat, lng, name }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // fallback to NYC-ish if permission denied
        setInitialRegion({
          latitude: 40.73061,
          longitude: -73.935242,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setInitialRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    })();
  }, []);

  const onMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    // Try reverse geocode for a nice label
    let label = "Meetup";
    try {
      const res = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = res?.[0];
      if (place) {
        // Pick something readable
        label =
          place.name ||
          place.street ||
          place.city ||
          place.region ||
          "Meetup";
      }
    } catch {
      // ignore
    }

    setPicked({ lat: latitude, lng: longitude, name: label });
  };

  const onSave = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      await saveMeetup(groupId, {
        name: picked.name || "Meetup",
        lat: picked.lat,
        lng: picked.lng,
        radius_m: 150,
      });
      router.back(); // back to group screen
    } catch (e) {
      console.log("save meetup error:", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!initialRegion) {
    return (
      <Screen>
        <Title>Pick meetup</Title>
        <View className="mt-6">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-16 pb-3">
        <Text className="text-2xl font-bold text-zinc-900">Pick meetup</Text>
        <Text className="mt-1 text-sm text-zinc-600">
          Tap the map to drop a pin.
        </Text>
      </View>

      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onPress={onMapPress}
      >
        {picked && (
          <Marker
            coordinate={{ latitude: picked.lat, longitude: picked.lng }}
            title={picked.name}
          />
        )}
      </MapView>

      <View className="px-6 py-4 border-t border-zinc-200 bg-white">
        <Text className="text-sm text-zinc-500">Selected</Text>
        <Text className="mt-1 text-base font-semibold text-zinc-900">
          {picked ? `${picked.name}` : "None"}
        </Text>
        <Text className="mt-1 text-sm text-zinc-600">
          {picked ? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : "Tap to choose a location"}
        </Text>

        <Pressable
          className={`mt-3 rounded-2xl px-5 py-4 ${picked && !saving ? "bg-zinc-900" : "bg-zinc-300"}`}
          disabled={!picked || saving}
          onPress={onSave}
        >
          <Text className="text-center text-base font-semibold text-white">
            {saving ? "Saving..." : "Save meetup"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}