import { useState } from "react";
import { View, Text, Pressable, TextInput, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../../../constants/supabase";
import { fmtDateTime } from "../../../../constants/geo";

export default function CreateHangTime() {
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#FCFFFE"];
  
  const { meetup_name, meetup_lat, meetup_lng } = useLocalSearchParams();

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const canNext = !!startTime && !loading;

  const cardBlue = "#F3FBFC"; // lighter than #CFEAEC
  const cardBase = "rounded-3xl p-6 shadow-sm"; // bigger

  const outsideLabel = "px-2 text-sm font-extrabold tracking-widest uppercase text-gray-700";
  
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
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* Header (match map page) */}
          <View className="px-4 pt-10 pb-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm"
              >
                <MaterialIcons name="arrow-back" size={22} color="#374151" />
              </Pressable>

              <Text className="text-2xl font-bold text-gray-900">Name & time</Text>
              <View className="w-12 h-12" />
            </View>
          </View>

          {/* Content */}
          <View className="flex-1 px-4">
            {/* Grouped form container (feels less divided) */}
            <View className="p-1">
              {/* Destination (event-style colored bar) */}
              <Text className={outsideLabel}>Destination</Text>
              <View className={`mt-2 ${cardBase}`} style={{ backgroundColor: cardBlue }}>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="place" size={20} color="#334155" />
                  <Text className="text-lg font-semibold text-gray-800">
                    {meetup_name ? String(meetup_name) : "Meetup"}
                  </Text>
                </View>
              </View>

              {/* Hang name (event-style colored bar) */}
              <Text className={`mt-4 ${outsideLabel}`}>Hang name</Text>
              <View className={`mt-2 ${cardBase}`} style={{ backgroundColor: cardBlue }}>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="edit" size={20} color="#334155" />
                  <Text className="text-lg font-semibold text-gray-800">Name it</Text>
                </View>

                <View
                  className="mt-4 bg-white/85 rounded-2xl px-4"
                  style={{ height: 52, justifyContent: "center" }}
                >
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Taco Tuesday 🌮"
                    placeholderTextColor="#6b7280"
                    returnKeyType="done"
                    style={{ fontSize: 18, paddingVertical: 0, color: "#111827", fontWeight: "700" }}
                  />
                </View>
              </View>

              {/* Start time (event-style colored bar) */}
              <Text className={`mt-4 ${outsideLabel}`}>Start time</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setShow(true);
                }}
                className={`mt-2 ${cardBase}`}
                style={{ backgroundColor: cardBlue }}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="schedule" size={20} color="#334155" />
                  <Text className="text-lg font-semibold text-gray-800">
                    {startTime ? fmtDateTime(startTime) : "Tap to pick"}
                  </Text>
                </View>
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

              {/* Next button (kept your style, but placed inside the group so it feels cohesive) */}
              <Pressable
                disabled={!canNext}
                onPress={onCreateDraft}
                className={`mt-4 rounded-2xl px-5 py-3.5 border ${
                  canNext ? "bg-white border-emerald-300" : "bg-gray-200 border-gray-300"
                }`}
              >
                <Text
                  className={`text-center text-base font-bold ${
                    canNext ? "text-emerald-700" : "text-gray-500"
                  }`}
                >
                  {loading ? "Saving..." : "Next"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}