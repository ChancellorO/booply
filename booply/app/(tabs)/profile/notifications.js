import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const BLACK = "#18181b";
const GLASS = "rgba(255,255,255,0.45)";
const GLASS_BORDER = "rgba(255,255,255,0.6)";

export default function Notifications() {
  const router = useRouter();

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={BLACK} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Invites & updates</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Group invites</Text>
          <Text style={styles.value}>On</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Friend requests</Text>
          <Text style={styles.value}>On</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Reminder pings</Text>
          <Text style={styles.value}>On</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf2" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: BLACK },

  card: {
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 18,
  },
  title: { fontSize: 16, fontWeight: "800", color: BLACK },
  sub: { marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.55)" },

  row: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 14, fontWeight: "700", color: BLACK },
  value: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
});