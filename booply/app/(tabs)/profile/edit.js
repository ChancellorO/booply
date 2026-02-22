import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../constants/supabase";

const BLACK = "#18181b";
const GREEN = "#16a34a";
const MUTED = "rgba(0,0,0,0.45)";
const GLASS = "rgba(255,255,255,0.45)";
const GLASS_BORDER = "rgba(255,255,255,0.6)";
const gradientColors = ["#A9CBB2", "#CFE6D8", "#F7FBF8"];

const fallbackAvatar = require("../../../assets/images/dumbways.png");

function safeFileExt(uri = "") {
  const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const ext = (m?.[1] || "jpg").toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";
}

function guessContentType(ext) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const displayEmail = useMemo(() => profile?.email || me?.email || "—", [profile, me]);
  const avatarUri = profile?.avatar_url || null;

  async function load() {
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      setMe(user);

      if (!user?.id) {
        setProfile(null);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id,email,first_name,last_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!p) {
        const email = (user.email || "").toLowerCase();
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || "";
        const [first, ...rest] = String(fullName).split(" ").filter(Boolean);
        const last = rest.join(" ");

        const { data: up, error: upErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email,
              first_name: meta.given_name || first || "",
              last_name: meta.family_name || last || "",
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (upErr) throw upErr;
        setProfile(up);
        setFirstName(up.first_name || "");
        setLastName(up.last_name || "");
      } else {
        setProfile(p);
        setFirstName(p.first_name || "");
        setLastName(p.last_name || "");
      }
    } catch (e) {
      console.log("edit profile load error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pickAndUploadPhoto() {
    if (uploading) return;

    try {
      setUploading(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access to change your avatar.");
        return;
      }

      // ✅ correct mediaTypes usage
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.images],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      const uri = asset?.uri;
      if (!uri) throw new Error("No image selected.");
      if (!me?.id) throw new Error("Not logged in.");

      const ext = safeFileExt(uri);
      const contentType = guessContentType(ext);

      const res = await fetch(uri);
      const arrayBuffer = await res.arrayBuffer();

      const path = `avatars/${me.id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL.");

      const { data: updated, error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", me.id)
        .select("id,email,first_name,last_name,avatar_url")
        .single();

      if (pErr) throw pErr;

      setProfile(updated);
    } catch (e) {
      console.log("avatar upload error:", e?.message ?? e);
      Alert.alert("Upload failed", e?.message ?? "Could not upload avatar.");
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    if (saving) return;
    try {
      setSaving(true);
      if (!me?.id) throw new Error("Not logged in.");

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", me.id)
        .select("id,email,first_name,last_name,avatar_url")
        .single();

      if (error) throw error;

      setProfile(data);
      router.back();
    } catch (e) {
      console.log("save profile error:", e?.message ?? e);
      Alert.alert("Save failed", e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        style={{ flex: 1, paddingTop: insets.top, justifyContent: "center", alignItems: "center" }}
      >
    <ActivityIndicator />
  </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <StatusBar barStyle="dark-content" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="px-4 pt-10 pb-4">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => router.back()}
                  className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm"
                >
                  <Ionicons name="chevron-back" size={22} color="#374151" />
                </Pressable>

                <Text className="text-2xl font-bold text-gray-900">Edit profile</Text>

                <View className="w-12 h-12" />
              </View>
            </View>

            {/* Card */}
            <View
              className="mx-4 rounded-3xl p-5 shadow-sm border border-white/60"
              style={{ backgroundColor: "#F3FBFC" }}
            >
              <Text className="px-1 text-sm font-extrabold tracking-widest uppercase text-gray-700">
                Photo
              </Text>

              <View
                className="mt-2 rounded-3xl p-5 shadow-sm border border-white/60"
                style={{ backgroundColor: "#FFFFFFAA" }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 rounded-2xl bg-white/80 items-center justify-center border border-white/60">
                    <Ionicons name="camera" size={18} color="#334155" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>
                      {displayEmail}
                    </Text>

                    <Pressable
                      onPress={pickAndUploadPhoto}
                      disabled={uploading}
                      className="mt-2 bg-white border border-gray-300 rounded-full px-4 h-11 items-center justify-center shadow-sm self-start"
                      style={uploading ? { opacity: 0.6 } : null}
                    >
                      <Text className="text-sm font-bold text-gray-700">
                        {uploading ? "Uploading..." : "Change photo"}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-gray-200">
                    <Image
                      source={avatarUri ? { uri: avatarUri } : fallbackAvatar}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                </View>
              </View>

              <Text className="mt-5 px-1 text-sm font-extrabold tracking-widest uppercase text-gray-700">
                First name
              </Text>
              <View className="mt-2 bg-white border border-gray-300 rounded-2xl px-4 h-12 justify-center shadow-sm">
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#6b7280"
                  style={{ fontSize: 16, color: "#111827" }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <Text className="mt-4 px-1 text-sm font-extrabold tracking-widest uppercase text-gray-700">
                Last name
              </Text>
              <View className="mt-2 bg-white border border-gray-300 rounded-2xl px-4 h-12 justify-center shadow-sm">
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#6b7280"
                  style={{ fontSize: 16, color: "#111827" }}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>
            {/* Save button */}
            <View className="px-4 mt-4">
              <Pressable
                onPress={onSave}
                disabled={saving}
                className={`rounded-2xl px-5 py-3.5 border ${
                  saving ? "bg-gray-200 border-gray-300" : "bg-white border-emerald-300"
                }`}
                style={saving ? { opacity: 0.8 } : null}
              >
                <Text
                  className={`text-center text-base font-bold ${
                    saving ? "text-gray-500" : "text-emerald-700"
                  }`}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf2" },
});