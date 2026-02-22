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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { supabase } from "../../../constants/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BLACK = "#18181b";
const GREEN = "#16a34a";
const MUTED = "rgba(0,0,0,0.45)";
const GLASS = "rgba(255,255,255,0.7)";
const GLASS_BORDER = "rgba(229,231,235,0.95)";

const fallbackAvatar = require("../../../assets/images/dumbways.png");

function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function reverseToCityState(coords) {
  try {
    const res = await Location.reverseGeocodeAsync(coords);
    const p = res?.[0];
    if (!p) return null;

    // iOS / Android vary: use best available fields
    const city =
      p.city ||
      p.subregion ||
      p.district ||
      p.region ||
      p.name ||
      null;

    const region = p.region || p.subregion || null;

    const text = [city, region].filter(Boolean).join(", ");
    return text || null;
  } catch {
    return null;
  }
}

export default function Profile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#FCFFFE"];

  // location display
  const [locText, setLocText] = useState("—");

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
        .select(
          [
            "id",
            "email",
            "first_name",
            "last_name",
            "avatar_url",
            // stats if you have them; safe if missing:
            "on_time_count",
            "late_count",
            "punctuality_score",
            "top_percent_month",
            "punctuality_streak",
            "best_punctuality_streak",
            "last_punctuality_result",
            "last_punctuality_at",
          ].join(",")
        )
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      // Ensure a profile row exists (and seed names from auth metadata if empty)
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
      } else {
        // If the profile exists but names are blank, try backfilling once
        const fn = (p.first_name || "").trim();
        const ln = (p.last_name || "").trim();

        if (!fn && !ln) {
          const meta = user.user_metadata || {};
          const fullName = meta.full_name || meta.name || "";
          const [first, ...rest] = String(fullName).split(" ").filter(Boolean);
          const last = rest.join(" ");
          const fallbackFirst = meta.given_name || first || "";
          const fallbackLast = meta.family_name || last || "";

          if (fallbackFirst || fallbackLast) {
            const { data: up2, error: upErr2 } = await supabase
              .from("profiles")
              .update({
                first_name: fallbackFirst,
                last_name: fallbackLast,
              })
              .eq("id", user.id)
              .select()
              .single();

            if (!upErr2) setProfile(up2);
            else setProfile(p);
          } else {
            setProfile(p);
          }
        } else {
          setProfile(p);
        }
      }
    } catch (e) {
      console.log("profile load error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocText("—");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({});
      const text = await reverseToCityState({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      setLocText(text || "—");
    } catch (e) {
      setLocText("—");
    }
  }

  useEffect(() => {
    load();
    loadLocation();
  }, []);

  useEffect(() => {
  let channel;

  (async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    channel = supabase
      .channel(`profiles_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${uid}`,
        },
        (payload) => {
          // payload.new has the updated row
          setProfile((prev) => ({ ...(prev || {}), ...(payload?.new || {}) }));
        }
      )
      .subscribe();
  })();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, []);

  const displayName = useMemo(() => {
    const fn = (profile?.first_name || "").trim();
    const ln = (profile?.last_name || "").trim();
    if (fn || ln) return `${fn} ${ln}`.trim();
    return profile?.email || me?.email || "Profile";
  }, [profile, me]);

  const onTime = Number.isFinite(profile?.on_time_count) ? profile.on_time_count : 0;
  const late = Number.isFinite(profile?.late_count) ? profile.late_count : 0;

  const rate = useMemo(() => {
    const total = onTime + late;
    if (!total) return "—";
    return `${Math.round((onTime / total) * 100)}%`;
  }, [onTime, late]);

const streak = Number.isFinite(profile?.punctuality_streak) ? profile.punctuality_streak : 0;
const bestStreak = Number.isFinite(profile?.best_punctuality_streak) ? profile.best_punctuality_streak : 0;
  const topPercent = Number.isFinite(profile?.top_percent_month) ? profile.top_percent_month : null;

  async function onLogout() {
    try {
      await supabase.auth.signOut();
      router.replace("/(auth)");
    } catch (e) {
      console.log("logout error:", e?.message ?? e);
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
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 pt-10 pb-4">
          <Text className="text-3xl font-bold text-gray-900">Profile</Text>
          <Text className="mt-2 text-sm text-gray-600">
            Booply Account
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>

              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color={MUTED} />
                <Text style={styles.muted} numberOfLines={1}>
                  {locText}
                </Text>
              </View>
            </View>

            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color={BLACK} />
              <Text style={styles.timeBadgeText}>{formatTime()}</Text>
            </View>
          </View>

          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Image source={fallbackAvatar} style={styles.avatar} />
            )}
          </View>

          {/* Stats row */}
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{onTime}</Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{rate}</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreNumber}>{streak}</Text>
            <Ionicons name="flame" size={32} color="#f97316" />
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.scoreLabel}>On-time Streak</Text>
            <Text style={styles.scoreSub}>
              {topPercent != null ? `Top ${topPercent}% this month` : "Keep it up this month"}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        <View style={styles.menuContainer}>
          {/* Edit Profile */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/edit")}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name="person-outline" size={20} color={GREEN} />
              </View>

              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>Edit Profile</Text>
                <Text style={styles.menuSub}>Update your info & photo</Text>
              </View>
            </View>

            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={MUTED}/>
            </View>
          </Pressable>

          {/* Notifications */}
          <Pressable
            onPress={() => router.push("/(tabs)/profile/notifications")}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name="notifications-outline" size={20} color={GREEN} />
              </View>

              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>Notifications</Text>
                <Text style={styles.menuSub}>Manage your alerts</Text>
              </View>
            </View>

            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={MUTED}/>
            </View>
          </Pressable>

          {/* Log Out */}
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, styles.menuIconDanger]}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>

              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>Log Out</Text>
                <Text style={styles.menuSub}>Sign out of your account</Text>
              </View>
            </View>

            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={MUTED}/>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf2" },
  scroll: { paddingBottom: 48 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 18,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: BLACK,
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  name: { fontSize: 22, fontWeight: "700", color: BLACK },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  muted: { color: MUTED, fontSize: 13, flexShrink: 1 },

  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeBadgeText: { color: BLACK, fontSize: 13, fontWeight: "600" },

  avatarContainer: { alignItems: "center", marginTop: 20 },
  avatar: { width: 120, height: 120, borderRadius: 80, borderWidth: 2, borderColor: MUTED },

  cardStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  statItem: { alignItems: "center", gap: 6 },
  statValue: { color: BLACK, fontSize: 20, fontWeight: "700" },
  statLabel: { color: MUTED, fontSize: 12 },
  statDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.08)" },

  scoreCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  scoreLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreNumber: { fontSize: 46, fontWeight: "800", color: GREEN },
  scoreLabel: { color: BLACK, fontSize: 16, fontWeight: "600", textAlign: "right" },
  scoreSub: { color: MUTED, fontSize: 12, marginTop: 4, textAlign: "right" },

  sectionLabel: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  menuContainer: { marginHorizontal: 16, gap: 10 },
  menuItem: {
    width: "100%",
    position: "relative",
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingRight: 54,              // ✅ reserve space for chevron

    borderRadius: 24,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0, // important so text can shrink instead of pushing layout weirdly
  },

  menuItemPressed: { opacity: 0.75 },
  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(22,163,74,0.14)", // soft green tint
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuText: { flex: 1, marginLeft: 14, minWidth: 0 },
  menuLabel: { color: BLACK, fontSize: 15, fontWeight: "600" },
  menuSub: { color: MUTED, fontSize: 12, marginTop: 2 },

  logoutBtn: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  logoutText: { color: "#ef4444", fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 },

  chevronWrap: {
    position: "absolute",          // ✅ force to the right
  right: 18,
  top: 0,
  bottom: 0,
  justifyContent: "center",      // ✅ vertical center
  alignItems: "center",
  },

  menuIconDanger: {
    backgroundColor: "rgba(239,68,68,0.14)",
  },
});