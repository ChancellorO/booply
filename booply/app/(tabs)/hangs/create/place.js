import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, TextInput, Keyboard, TouchableWithoutFeedback } from "react-native";
import { router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CreateHangPlace() {
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#F7FBF8"];
  const cardBlue = "#F3FBFC";
  
  const [initialRegion, setInitialRegion] = useState(null);
  const [pickedCoord, setPickedCoord] = useState(null); // { lat, lng }
  const [pickedName, setPickedName] = useState(null);   // string

  const [query, setQuery] = useState("");

  const onSearch = () => {
    Keyboard.dismiss();
  };

  const reverseName = async (lat, lng) => {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = res?.[0];
      if (!p) return "Meetup";
      return [p.name, p.street, p.city].filter(Boolean).join(" ") || "Meetup";
    } catch {
      return "Meetup";
    }
  };

  const onMapPress = async (e) => {
    Keyboard.dismiss();
   
    const coord = e?.nativeEvent?.coordinate;
    if (!coord || typeof coord.latitude !== "number" || typeof coord.longitude !== "number") return;
    
    const { latitude, longitude } = coord;

    setPickedCoord({ lat: latitude, lng: longitude });
    setPickedName("Meetup");

    const label = await reverseName(latitude, longitude);
    setPickedName(label);
  };

  const onNext = () => {
    if (!pickedCoord) return;
    router.push({
      pathname: "/(tabs)/hangs/create/time",
      params: {
        meetup_name: pickedName || "Meetup",
        meetup_lat: String(pickedCoord.lat),
        meetup_lng: String(pickedCoord.lng),
      },
    });
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setInitialRegion({
          latitude: 40.73061,
          longitude: -73.935242,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setInitialRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    })();
  }, []);

  if (!initialRegion) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
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
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
        }}
        accessible={false}
      >
        <View style={{ flex: 1}}>
        {/* Header */}
          <View className="px-4 pt-10 pb-4">
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => router.back()} 
                className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm">
                <MaterialIcons name="arrow-back" size={22} color="#374151" />
              </Pressable>
              <Text className="text-2xl font-bold text-gray-900">Pick a place</Text>
              <View className="w-12 h-12" />
            </View>
          </View>
          
          <View className="px-4 pb-3">
            <View
              className="bg-white border border-gray-300 rounded-full px-4 shadow-sm"
              style={{ height: 48, justifyContent: "center" }}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search a place..."
                placeholderTextColor="#6b7280"
                returnKeyType="search"
                onSubmitEditing={onSearch}
                style={{ fontSize: 16, paddingVertical: 0, color: "#111827" }}
              />
            </View>
          </View>

          {/* Map in card */}
          <View className="flex-1 px-3 pb-3">
            <View className="flex-1 rounded-3xl overflow-hidden border border-white/60 bg-white/40">
              <MapView style={{ flex: 1 }} initialRegion={initialRegion} onPress={onMapPress}>
                {pickedCoord ? (
                  <Marker 
                    coordinate={{ latitude: pickedCoord.lat, longitude: pickedCoord.lng }} 
                    pinColor="#8CBDB8"/>
                ) : null}
              </MapView>
            </View>

            {/* Bottom card */}
            <View 
              className="mt-3 rounded-3xl p-4 shadow-sm"
              style={{ backgroundColor: cardBlue }}
            >
              <Text className="text-xs font-bold text-blue-900 tracking-wider uppercase">Selected</Text>
              <Text className="mt-2 text-base font-semibold text-gray-800">
                {pickedName ? pickedName : "Tap the map to choose"}
              </Text>

              <Pressable
                disabled={!pickedCoord}
                onPress={onNext}
                className={`mt-3 rounded-2xl px-5 py-3.5 border ${
                  pickedCoord ? "bg-white border-emerald-300" : "bg-gray-200 border-gray-300"
                }`}
              >
                <Text
                  className={`text-center text-base font-bold ${
                    pickedCoord ? "text-emerald-700" : "text-gray-500"
                  }`}
                >
                  Next
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}