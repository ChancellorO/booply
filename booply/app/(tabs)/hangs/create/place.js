import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

export default function CreateHangPlace() {
  const [initialRegion, setInitialRegion] = useState(null);
  const [picked, setPicked] = useState(null); // { lat, lng, name }

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
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

  const reverseName = async (lat, lng) => {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = res?.[0];
      if (!p) return "Meetup";
      return [p.name, p.street, p.city].filter(Boolean).join(" ") || "Meetup";
    } catch {
      return "Meetup";
    }
  };

  const onMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const label = await reverseName(latitude, longitude);
    setPicked({ lat: latitude, lng: longitude, name: label });
  };

  const onNext = () => {
    if (!picked) return;
    router.push({
      pathname: "/(tabs)/hangs/create/time",
      params: {
        meetup_name: picked.name,
        meetup_lat: String(picked.lat),
        meetup_lng: String(picked.lng),
      },
    });
  };

  if (!initialRegion) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-14 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text className="text-base font-semibold text-slate-900">Pick a place</Text>
        <View className="h-10 w-10" />
      </View>

      <MapView style={{ flex: 1 }} initialRegion={initialRegion} onPress={onMapPress}>
        {picked ? (
          <Marker coordinate={{ latitude: picked.lat, longitude: picked.lng }} title={picked.name} />
        ) : null}
      </MapView>

      <View className="px-6 py-4 border-t border-zinc-200 bg-white">
        <Text className="text-xs font-semibold text-slate-500">Selected</Text>
        <Text className="mt-1 text-base font-semibold text-slate-900">
          {picked ? picked.name : "Tap the map to choose"}
        </Text>

        <Pressable
          className={`mt-3 rounded-2xl px-5 py-4 ${picked ? "bg-zinc-900" : "bg-zinc-300"}`}
          disabled={!picked}
          onPress={onNext}
        >
          <Text className="text-center text-base font-semibold text-white">Next</Text>
        </Pressable>
      </View>
    </View>
  );
}