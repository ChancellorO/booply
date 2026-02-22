import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

export default function CreateHangPlace() {
  const insets = useSafeAreaInsets();
  const gradientColors = ["#A9CBB2", "#CFE6D8", "#F7FBF8"];
  const cardBlue = "#F3FBFC";
  const mapRef = useRef(null); // ✅ add this
  
  const [initialRegion, setInitialRegion] = useState(null);
  const [pickedCoord, setPickedCoord] = useState(null); // { lat, lng }
  const [pickedName, setPickedName] = useState(null); // string

  const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  console.log("GOOGLE KEY:", process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY);

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

  const moveTo = async ({ lat, lng, name }) => {
    setPickedCoord({ lat, lng });
    setPickedName(name || "Meetup");

    // animate map
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350
    );

    // if name is generic, improve with reverse geocode
    if (!name || name === "Meetup") {
      const label = await reverseName(lat, lng);
      setPickedName(label);
    }
  };

  const onMapPress = async (e) => {
    Keyboard.dismiss();
    const coord = e?.nativeEvent?.coordinate;
    if (!coord || typeof coord.latitude !== "number" || typeof coord.longitude !== "number") return;

    await moveTo({ lat: coord.latitude, lng: coord.longitude, name: "Meetup" });
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View className="px-4 pt-10 pb-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm"
              >
                <MaterialIcons name="arrow-back" size={22} color="#374151" />
              </Pressable>
              <Text className="text-2xl font-bold text-gray-900">Pick a place</Text>
              <View className="w-12 h-12" />
            </View>
          </View>

          {/* Search + dropdown */}
          <View className="px-4 pb-3" style={{ zIndex: 50 }}>
            {!GOOGLE_KEY ? (
              <View className="bg-white/70 border border-gray-200 rounded-3xl p-4">
                <Text className="text-sm font-semibold text-gray-800">
                  Missing Google Places key
                </Text>
                <Text className="mt-1 text-xs text-gray-600">
                  Set EXPO_PUBLIC_GOOGLE_MAPS_KEY in your .env
                </Text>
              </View>
            ) : (
              <GooglePlacesAutocomplete
                placeholder="Search a place..."
                fetchDetails={true}
                enablePoweredByContainer={false}
                keyboardShouldPersistTaps="handled"
                nearbyPlacesAPI="GooglePlacesSearch"
                debounce={250}
                onFail={(error) => console.log("PLACES FAIL:", error)}
                onNotFound={() => console.log("PLACES: no results")}
                query={{
                  key: GOOGLE_KEY,
                  language: "en",
                  // Bias results around the current map region
                  location: `${initialRegion.latitude},${initialRegion.longitude}`,
                  radius: 30000,
                }}
                onPress={async (data, details = null) => {
                  Keyboard.dismiss();

                  // details contains geometry when fetchDetails = true
                  const lat = details?.geometry?.location?.lat;
                  const lng = details?.geometry?.location?.lng;
                  if (typeof lat !== "number" || typeof lng !== "number") return;

                  // Use main_text as a clean label
                  const cleanName =
                    data?.structured_formatting?.main_text ||
                    data?.description ||
                    "Meetup";

                  await moveTo({ lat, lng, name: cleanName });
                }}
                textInputProps={{
                  placeholderTextColor: "#6b7280",
                  returnKeyType: "search",
                }}
                styles={{
                  container: {
                    flex: 0,
                  },
                  textInputContainer: {
                    backgroundColor: "transparent",
                    paddingHorizontal: 0,
                  },
                  textInput: {
                    height: 48,
                    borderRadius: 999,
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: "#111827",
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  },
                  listView: {
                    marginTop: 10,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: "rgba(255,255,255,0.75)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.6)",
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 4,
                  },
                  row: {
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: "transparent",
                  },
                  separator: {
                    height: 1,
                    backgroundColor: "rgba(0,0,0,0.06)",
                  },
                  description: {
                    color: "#111827",
                    fontSize: 14,
                    fontWeight: "600",
                  },
                }}
                renderRow={(rowData) => {
                  const main = rowData?.structured_formatting?.main_text || rowData?.description || "Place";
                  const secondary = rowData?.structured_formatting?.secondary_text || "";

                  return (
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 rounded-xl bg-emerald-100 items-center justify-center">
                        <MaterialIcons name="place" size={18} color="#2f6f57" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="text-sm font-bold text-gray-900">{main}</Text>
                        {secondary ? (
                          <Text className="text-xs text-gray-600" numberOfLines={1}>
                            {secondary}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>

          {/* Map */}
          <View className="flex-1 px-3 pb-3" style={{ zIndex: 1 }}>
            <View className="flex-1 rounded-3xl overflow-hidden border border-white/60 bg-white/40">
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={initialRegion}
                onPress={onMapPress}
              >
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