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

import { supabase } from "../../../constants/supabase";

const BLACK = "#18181b";
const GREEN = "#16a34a";
const MUTED = "rgba(0,0,0,0.45)";
const GLASS = "rgba(255,255,255,0.45)";
const GLASS_BORDER = "rgba(255,255,255,0.6)";

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
      <View style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: 140 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
                <Ionicons name="chevron-back" size={20} color={BLACK} />
              </Pressable>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={{ width: 44, height: 44 }} />
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.sectionSmall}>Photo</Text>

              <View style={styles.photoInnerRow}>
                <View style={styles.avatarWrap}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <Image source={fallbackAvatar} style={styles.avatar} />
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.emailText} numberOfLines={1}>
                    {displayEmail}
                  </Text>

                  <Pressable
                    onPress={pickAndUploadPhoto}
                    disabled={uploading}
                    style={({ pressed }) => [
                      styles.changePhotoBtn,
                      pressed && styles.pressed,
                      uploading && { opacity: 0.6 },
                    ]}
                  >
                    <Ionicons name="camera" size={16} color={GREEN} />
                    <Text style={styles.changePhotoText}>
                      {uploading ? "Uploading..." : "Change Photo"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* First name */}
              <Text style={[styles.inputLabel, { marginTop: 18 }]}>First name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Last name */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Last name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>
          </ScrollView>

          {/* ✅ Save button fixed */}
          <View style={[styles.bottomBar, { bottom: 16 + insets.bottom }]}>
            <Pressable
              onPress={onSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.9 },
                saving && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf2" },
  scroll: { paddingBottom: 24 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: BLACK },

  card: {
    marginHorizontal: 16,
    borderRadius: 26,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  sectionSmall: { fontSize: 14, fontWeight: "700", color: MUTED, marginBottom: 10 },
  photoInnerRow: { flexDirection: "row", alignItems: "center" },

  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.20)",
    backgroundColor: "rgba(255,255,255,0.40)",
  },
  avatar: { width: "100%", height: "100%" },

  emailText: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    marginBottom: 6,
  },

  changePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  changePhotoText: { fontSize: 18, fontWeight: "800", color: GREEN },

  inputLabel: { fontSize: 16, fontWeight: "700", color: "rgba(0,0,0,0.45)", marginBottom: 10 },
  inputBox: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { fontSize: 18, fontWeight: "600", color: BLACK },

  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  saveBtn: {
    borderRadius: 18,
    backgroundColor: "#0f172a",
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "900" },

  pressed: { opacity: 0.75 },
});