import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: -2,
          paddingBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      {/* Use EXACT route names from console */}
      <Tabs.Screen
        name="hangs"
        options={{
          title: "Hangs",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="friends/index"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="alerts/index"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      {/* Hide groups (it is currently being discovered under tabs) */}
      <Tabs.Screen name="groups/index" options={{ href: null }} />
      <Tabs.Screen name="groups/[group]" options={{ href: null }} />
      <Tabs.Screen name="groups/invites" options={{ href: null }} />
    </Tabs>
  );
}