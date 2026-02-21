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
      {/* Hangs */}
      <Tabs.Screen
        name="hangs"
        options={{
          title: "Hangs",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      {/* Friends */}
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      {/* Alerts */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />

      {/* Hide nested routes from showing as tabs */}
      <Tabs.Screen name="hangs/[id]" options={{ href: null }} />
      <Tabs.Screen name="hangs/create/place" options={{ href: null }} />
      <Tabs.Screen name="hangs/create/time" options={{ href: null }} />
      <Tabs.Screen name="hangs/create/invite" options={{ href: null }} />
    </Tabs>
  );
}