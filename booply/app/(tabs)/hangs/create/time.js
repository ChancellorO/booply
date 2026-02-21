import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../../constants/supabase";
import { fmtDateTime } from "../../../../constants/geo";

export default function CreateHangTime() {
  const { meetup_name, meetup_lat, meetup_lng } = useLocalSearchParams();

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onCreateDraft = async () => {
    if (!startTime || loading) return;
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData?.user;
      if (!me?.id) throw new Error("Not logged in");

      // 1) create group (draft, not locked yet)
      const g = await supabase
        .from("groups")
        .insert({
          name: name.trim() || "New Hang",
          created_by: me.id,
          start_time: startTime.toISOString(),
          locked: false,
        })
        .select()
        .single();

      if (g.error) throw g.error;

      // 2) add creator as member (your schema has group_id + user_id)
      const m = await supabase
        .from("group_members")
        .insert({ group_id: g.data.id, user_id: me.id, ready_state: "getting_ready" });

      if (m.error) throw m.error;

      // 3) save meetup into group_places (kind='meetup')
      const place = await supabase
        .from("group_places")
        .upsert(
          {
            group_id: g.data.id,
            kind: "meetup",
            name: meetup_name || "Meetup",
            lat: Number(meetup_lat),
            lng: Number(meetup_lng),
            radius_m: 150,
          },
          { onConflict: "group_id,kind" }
        );

      if (place.error) throw place.error;

      router.replace({
        pathname: "/(tabs)/hangs/create/invite",
        params: { groupId: g.data.id },
      });
    } catch (e) {
      console.log("create draft error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-14">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">Name & time</Text>
          <View className="h-10 w-10" />
        </View>

        <Text className="mt-4 text-2xl font-extrabold text-slate-900">Almost there</Text>
        <Text className="mt-1 text-sm text-slate-600">Give it a name and choose a start time.</Text>

        <View className="mt-6 rounded-3xl bg-white/70 px-5 py-5 border border-zinc-200">
          <Text className="text-xs font-semibold text-slate-500">Hang name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Taco Tuesday 🌮"
            placeholderTextColor="#94A3B8"
            className="mt-2 text-lg font-semibold text-slate-900"
          />
        </View>

        <Pressable
          onPress={() => setShow(true)}
          className="mt-4 rounded-3xl bg-white/70 px-5 py-5 border border-zinc-200"
        >
          <Text className="text-xs font-semibold text-slate-500">Start time</Text>
          <Text className="mt-2 text-lg font-semibold text-slate-900">
            {startTime ? fmtDateTime(startTime) : "Tap to pick"}
          </Text>
        </Pressable>

        <DateTimePickerModal
          isVisible={show}
          mode="datetime"
          onConfirm={(d) => {
            setShow(false);
            setStartTime(d);
          }}
          onCancel={() => setShow(false)}
        />

        <Pressable
          className={`mt-6 rounded-2xl px-5 py-4 ${startTime ? "bg-zinc-900" : "bg-zinc-300"}`}
          disabled={!startTime || loading}
          onPress={onCreateDraft}
        >
          <Text className="text-center text-base font-semibold text-white">
            {loading ? "Saving..." : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}