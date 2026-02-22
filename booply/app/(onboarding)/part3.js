import { useMemo, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../constants/supabase";

const PROJECT_REF = "hhjbabzwcatvnodqzpou";
const DEFAULT_AVATARS = [
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/avatars/defaults/1.png`,
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/avatars/defaults/2.png`,
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/avatars/defaults/3.png`,
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/avatars/defaults/4.png`,
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/avatars/defaults/5.png`,
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/avatars/defaults/6.png`,
];

async function uriToArrayBuffer(uri) {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

export default function Part3() {
  const [selected, setSelected] = useState(null); // url
  const [saving, setSaving] = useState(false);

  const canContinue = !!selected && !saving;

  async function pickAndUpload() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setSaving(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user?.id) throw new Error("No user");

      const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const body = await uriToArrayBuffer(asset.uri);

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, body, {
          contentType: asset.mimeType || "image/jpeg",
          upsert: true,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setSelected(data.publicUrl);
    } catch (e) {
      console.log("avatar upload error:", e?.message ?? e);
    } finally {
      setSaving(false);
    }
  }

  async function saveAndFinish() {
    if (!selected || saving) return;
    setSaving(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user?.id) throw new Error("No user");

      const kind = selected.includes("/defaults/") ? "default" : "uploaded";

      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: selected,
          avatar_kind: kind,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      router.replace("/(tabs)/groups"); // change to /hangs if needed
    } catch (e) {
      console.log("save avatar error:", e?.message ?? e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-6 pt-20">
        <Text className="text-2xl font-extrabold text-zinc-900">Pick a profile photo</Text>
        <Text className="mt-2 text-sm text-zinc-500">
          Choose a default avatar or upload your own.
        </Text>

        <View className="mt-6 flex-row flex-wrap justify-between">
          {DEFAULT_AVATARS.map((url) => {
            const active = selected === url;
            return (
              <Pressable
                key={url}
                onPress={() => setSelected(url)}
                className={`mb-4 w-[30%] aspect-square rounded-2xl overflow-hidden border-2 ${
                  active ? "border-emerald-500" : "border-transparent"
                }`}
              >
                <Image source={{ uri: url }} className="w-full h-full" />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={pickAndUpload}
          disabled={saving}
          className="mt-2 rounded-2xl border border-zinc-300 bg-zinc-50 p-4"
        >
          <Text className="text-center font-semibold text-zinc-900">
            {saving ? "Working..." : "Upload a photo"}
          </Text>
        </Pressable>

        <Pressable
          onPress={saveAndFinish}
          disabled={!canContinue}
          className={`mt-4 rounded-2xl p-4 ${canContinue ? "bg-zinc-900" : "bg-zinc-300"}`}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center text-white font-semibold">Finish</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}