import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { registerForPushAndSaveToken } from "../../constants/push";

const MINT = "#4FD1C5";
const INACTIVE = "#9CA3AF";
const BG = "#F7FBF8";

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    registerForPushAndSaveToken().catch((e) => console.log("push init err", e?.message ?? e));
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: MINT,
          tabBarInactiveTintColor: INACTIVE,
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: -2,
            paddingBottom: Platform.OS === "ios" ? 0 : 4,
            fontFamily: "DMSans_500Medium",
          },
          tabBarStyle: {
            height: Platform.OS === "ios" ? 86 : 66,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 20 : 8,
            backgroundColor: BG,
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
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
        name="friends"
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
        name="profile"
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
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
      </Tabs>
    </View>
  );
}