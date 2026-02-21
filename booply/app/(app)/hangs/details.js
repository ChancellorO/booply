import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../../components/ui";
import { PrimaryButton } from "../../../components/ui";
import { supabase } from "../../../constants/supabase";
import { fmtDateTime } from "../../../constants/geo";

export default function HangDetailsSetup() {
  const { id } = useLocalSearchParams();
  const groupId = id;

  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);

  const [startTime, setStartTime] = useState(null); // Date
  const [showPicker, setShowPicker] = useState(false);

  const [meetup, setMeetup] = useState(null); // {lat,lng,name}

  useEffect(() => {
    (async () => {
      setLoading(true);
      const g = await supabase
        .from("groups")
        .select("id,name,locked,start_time,meetup_lat,meetup_lng,meetup_name")
        .eq("id", groupId)
        .single();

      if (!g.error) {
        setGroup(g.data);
        setStartTime(g.data.start_time ? new Date(g.data.start_time) : null);
        if (g.data.meetup_lat && g.data.meetup_lng) {
          setMeetup({ lat: g.data.meetup_lat, lng: g.data.meetup_lng, name: g.data.meetup_name || "Meetup" });
        }
      }
      setLoading(false);
    })();
  }, [groupId]);

  const region = useMemo(() => {
    const center =
      meetup
        ? { latitude: meetup.lat, longitude: meetup.lng }
        : { latitude: 37.7749, longitude: -122.4194 };

    return { ...center, latitudeDelta: 0.03, longitudeDelta: 0.03 };
  }, [meetup]);

  async function reverseName(lat, lng) {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = res?.[0];
      if (!p) return "Meetup";
      const parts = [p.name, p.street, p.city].filter(Boolean);
      return parts.join(" ");
    } catch {
      return "Meetup";
    }
  }

  const onMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const name = await reverseName(latitude, longitude);
    setMeetup({ lat: latitude, lng: longitude, name });

    await supabase
      .from("groups")
      .update({ meetup_lat: latitude, meetup_lng: longitude, meetup_name: name })
      .eq("id", groupId);
  };

  const onTimeChange = async (_, selected) => {
    if (!selected) {
      setShowPicker(false);
      return;
    }
    setStartTime(selected);
    if (Platform.OS !== "ios") setShowPicker(false);

    await supabase.from("groups").update({ start_time: selected.toISOString() }).eq("id", groupId);
  };

  const onLock = async () => {
    if (!startTime || !meetup) return;

    const u = await supabase
      .from("groups")
      .update({ locked: true })
      .eq("id", groupId)
      .select()
      .single();

    if (u.error) {
      console.log("lock error:", u.error.message);
      return;
    }
    router.replace(`/(app)/hangs/${groupId}/invite`);
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  if (group?.locked) {
    // already locked → go to main details
    router.replace(`/(app)/hangs/${groupId}`);
    return null;
  }

  return (
    <Screen>
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">Set details</Text>
          <View className="h-10 w-10" />
        </View>

        <Text className="mt-3 text-2xl font-extrabold text-slate-900">{group?.name}</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Pick time + location. Once confirmed, you can’t edit.
        </Text>

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
            onChange={onTimeChange}
          />
        )}

        {/* Map */}
        <View className="mt-4 overflow-hidden rounded-3xl bg-white/70">
          <View className="px-5 pt-4">
            <Text className="text-xs font-semibold text-slate-500">Meetup location</Text>
            <Text className="mt-1 text-sm text-slate-700">
              Tap the map to set the meetup spot
            </Text>
          </View>

          <View className="mt-3 h-64">
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={region}
              onPress={onMapPress}
            >
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

        <PrimaryButton
          title="Confirm & Lock"
          onPress={onLock}
          disabled={!startTime || !meetup}
          className="mt-6"
        />
      </View>
    </Screen>
  );
}