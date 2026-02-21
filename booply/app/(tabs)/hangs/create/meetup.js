import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../../components/ui";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { fmtDateTime } from "../../../../constants/geo";

export default function CreateHangMeetup() {
  const { name } = useLocalSearchParams();

  const [initialRegion, setInitialRegion] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [meetup, setMeetup] = useState(null); // { lat, lng, name }

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

  async function reverseName(lat, lng) {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = res?.[0];
      if (!p) return "Meetup";
      return [p.name, p.street, p.city].filter(Boolean).join(" ") || "Meetup";
    } catch {
      return "Meetup";
    }
  }

  const onMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const label = await reverseName(latitude, longitude);
    setMeetup({ lat: latitude, lng: longitude, name: label });
  };

  const onNext = () => {
    if (!startTime || !meetup) return;

    router.push({
      pathname: "/(tabs)/hangs/create/members",
      params: {
        name,
        start_time: startTime.toISOString(),
        meetup_name: meetup.name,
        meetup_lat: String(meetup.lat),
        meetup_lng: String(meetup.lng),
      },
    });
  };

  if (!initialRegion) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="px-6 pt-14 pb-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">Time & Place</Text>
          <View className="h-10 w-10" />
        </View>

        <Text className="mt-3 text-2xl font-extrabold text-slate-900">{name}</Text>
        <Text className="mt-1 text-sm text-slate-600">Pick when + where you’re meeting.</Text>

        {/* Time */}
        <Pressable
          onPress={() => setShowPicker(true)}
          className="mt-5 rounded-3xl bg-white/70 px-5 py-4"
        >
          <Text className="text-xs font-semibold text-slate-500">Start time</Text>
          <Text className="mt-1 text-lg font-semibold text-slate-900">
            {startTime ? fmtDateTime(startTime) : "Select time"}
          </Text>
        </Pressable>

        {showPicker && (
          <DateTimePicker
            value={startTime ?? new Date()}
            mode="datetime"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, selected) => {
              setShowPicker(false);
              if (!selected) return;
              setStartTime(selected);
            }}
          />
        )}

        {/* Map */}
        <View className="mt-4 overflow-hidden rounded-3xl bg-white/70">
          <View className="px-5 pt-4">
            <Text className="text-xs font-semibold text-slate-500">Meetup location</Text>
            <Text className="mt-1 text-sm text-slate-700">Tap the map to drop a pin</Text>
          </View>

          <View className="mt-3 h-64">
            <MapView style={{ flex: 1 }} initialRegion={initialRegion} onPress={onMapPress}>
              {meetup ? (
                <Marker
                  coordinate={{ latitude: meetup.lat, longitude: meetup.lng }}
                  title={meetup.name}
                />
              ) : null}
            </MapView>
          </View>

          <View className="px-5 py-4">
            <Text className="text-sm font-semibold text-slate-900">
              {meetup?.name ?? "No location selected"}
            </Text>
          </View>
        </View>

        <PrimaryButton title="Next" onPress={onNext} disabled={!startTime || !meetup} className="mt-6" />
      </View>
    </Screen>
  );
}