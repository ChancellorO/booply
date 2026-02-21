import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";
import { saveMeetup } from "../../constants/db";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text, Pressable, Platform } from "react-native";

export default function SetMeetup() {
  const { groupId } = useLocalSearchParams();
  const [name, setName] = useState("Meetup");
  const [startTime, setStartTime] = useState(null); // Date | null
  const [showPicker, setShowPicker] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    setErr("");
    setLoading(true);
    try {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const rNum = Number(radius);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        throw new Error("Latitude / Longitude must be valid numbers");
      }

      await saveMeetup(groupId, { name, start_time: startTime, lat: latNum, lng: lngNum, radius_m: rNum });
      router.back();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Meetup location</Title>

      <Label>Name</Label>
      <Input value={name} onChangeText={setName} />

        <Label>Start time</Label>

        <Pressable
        onPress={() => setShowPicker(true)}
        className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4"
        >
        <Text className="text-base text-zinc-900">
            {startTime
            ? startTime.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                })
            : "Select start time"}
        </Text>
        </Pressable>

        {showPicker && (
        <DateTimePicker
            value={startTime ?? new Date()}
            mode="datetime"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, selectedDate) => {
            setShowPicker(false);
            if (!selectedDate) return; // user cancelled (Android)
            setStartTime(selectedDate);
            }}
        />
        )}
      <Label>Latitude</Label>
      <Input value={lat} onChangeText={setLat} placeholder="40.73061" keyboardType="numeric" />

      <Label>Longitude</Label>
      <Input value={lng} onChangeText={setLng} placeholder="-73.935242" keyboardType="numeric" />

      <Label>Radius (m)</Label>
      <Input value={radius} onChangeText={setRadius} keyboardType="numeric" />

      <ErrorText>{err}</ErrorText>

      <PrimaryButton
        title={loading ? "Saving..." : "Save"}
        onPress={onSave}
        disabled={loading || !lat || !lng}
      />
    </Screen>
  );
}