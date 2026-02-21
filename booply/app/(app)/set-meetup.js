import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";
import { saveMeetup } from "../../constants/db";

export default function SetMeetup() {
  const { groupId } = useLocalSearchParams();
  const [name, setName] = useState("Meetup");
  const [startTime, setStartTime] = useState("");
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

      await saveMeetup(groupId, { name, startTime, lat: latNum, lng: lngNum, radius_m: rNum });
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
      <Input value={startTime} onChangeText={setStartTime} placeholder="2024-01-01T12:00:00Z" />

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