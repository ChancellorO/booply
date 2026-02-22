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

import { supabase } from "../../../constants/supabase";

const BLACK = "#18181b";
const GREEN = "#16a34a";
const MUTED = "rgba(0,0,0,0.45)";
const GLASS = "rgba(255,255,255,0.45)";
const GLASS_BORDER = "rgba(255,255,255,0.6)";

const fallbackAvatar = require("../../../assets/images/dumbways.png");

function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Profile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // auth user
  const [profile, setProfile] = useState(null); // profiles row

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
            "location",
            "avatar_url",
            // optional fields (screen will fallback if missing/null)
            "on_time_count",
            "late_count",
            "punctuality_score",
            "top_percent_month",
          ].join(",")
        )
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      // If profile row doesn't exist yet, you can upsert a minimal one
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
        setProfile(p);
      }
    } catch (e) {
      console.log("profile load error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const displayName = useMemo(() => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
    }
    return profile?.email || me?.email || "Profile";
  }, [profile, me]);

  const locationText = profile?.location || "—";

  const onTime = Number.isFinite(profile?.on_time_count) ? profile.on_time_count : 0;
  const late = Number.isFinite(profile?.late_count) ? profile.late_count : 0;

  const rate = useMemo(() => {
    const total = onTime + late;
    if (!total) return "—";
    return `${Math.round((onTime / total) * 100)}%`;
  }, [onTime, late]);

  const score = Number.isFinite(profile?.punctuality_score) ? profile.punctuality_score : 0;
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
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push("/(tabs)/edit-profile")}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          >
            <Ionicons name="pencil" size={16} color={BLACK} />
            <Text style={styles.headerBtnText}>Edit</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Profile</Text>

          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          >
            <Ionicons name="settings-outline" size={20} color={BLACK} />
          </Pressable>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color={MUTED} />
                <Text style={styles.muted}>{locationText}</Text>
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

        {/* ── Score Card ── */}
        <View style={styles.scoreCard}>
          <View style={styles.row}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Ionicons name="flame" size={32} color="#f97316" />
          </View>
          <View>
            <Text style={styles.scoreLabel}>Punctuality Score</Text>
            <Text style={styles.scoreSub}>
              {topPercent != null ? `Top ${topPercent}% this month` : "Keep it up this month"}
            </Text>
          </View>
        </View>

        {/* ── Section Label ── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        {/* ── Menu Buttons ── */}
        <View style={styles.menuContainer}>
          {[
            {
              label: "Edit Profile",
              sub: "Update your info & photo",
              icon: "person-outline",
              route: "/(tabs)/edit-profile",
            },
            {
              label: "See Stats",
              sub: "View your punctuality history",
              icon: "bar-chart-outline",
              route: null,
            },
            {
              label: "Achievements",
              sub: "Badges and milestones",
              icon: "trophy-outline",
              route: null,
            },
            {
              label: "Notifications",
              sub: "Manage your alerts",
              icon: "notifications-outline",
              route: "/(tabs)/alerts",
            },
            {
              label: "Settings",
              sub: "App preferences & account",
              icon: "settings-outline",
              route: "/(tabs)/settings",
            },
          ].map((item, i) => (
            <Pressable
              key={i}
              onPress={() => item.route && router.push(item.route)}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={GREEN} />
              </View>

              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={MUTED}
                style={{ marginLeft: "auto" }}
              />
            </Pressable>
          ))}
        </View>

        {/* ── Log Out ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf2" },
  scroll: { paddingBottom: 48 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 22,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerBtnText: { fontSize: 14, fontWeight: "500", color: BLACK },
  headerTitle: { fontSize: 18, fontWeight: "700", color: BLACK },

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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: { fontSize: 22, fontWeight: "700", color: BLACK },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  muted: { color: MUTED, fontSize: 13 },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  statItem: { alignItems: "center", gap: 4 },
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
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  scoreNumber: { fontSize: 52, fontWeight: "800", color: GREEN, marginRight: 8 },
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: GLASS,
    borderWidth: 2,
    borderColor: GLASS_BORDER,
  },
  menuItemPressed: { opacity: 0.75 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, marginLeft: 14 },
  menuLabel: { color: BLACK, fontSize: 15, fontWeight: "500" },
  menuSub: { color: MUTED, fontSize: 12 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoutText: { color: "#ef4444", fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});