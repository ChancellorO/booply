import { useState } from "react";
import { Pressable, Text, View, ScrollView, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const imgAvatar1 = "http://localhost:3845/assets/b21c117634f9a4a2b16fe585c9292570b872d090.png";
const imgAvatar2 = "http://localhost:3845/assets/928a79cce6541f0446291bb5574fbc0f4c5bdcba.png";
const imgAvatar3 = "http://localhost:3845/assets/6fc72e5405636e449ee84066d9a515fa7b290fa2.png";
const imgAvatar4 = "http://localhost:3845/assets/53b91a5b640079f2bc2031cb0e86a4b8c1e72081.png";
const imgAvatar5 = "http://localhost:3845/assets/af247a617d2527f8544d7d076dbd0f7401e26eb3.png";
const imgAvatar6 = "http://localhost:3845/assets/2f57039afa8118cd4a9d6b25e5fcf849cc8a27b6.png";
const mascotImage = require("../../assets/images/bloopy-mascot.png");

export default function CreateHang() {
  const router = useRouter();
  const [upcomingHangs, setUpcomingHangs] = useState([
    {
      id: 1,
      title: "Board Game Night",
      date: "Oct 24",
      time: "7:00 PM",
      avatars: [imgAvatar1, imgAvatar2],
      emoji: null,
    },
    {
      id: 2,
      title: "Taco Tuesday",
      date: "Oct 27",
      time: "6:30 PM",
      avatars: [imgAvatar3, imgAvatar4],
      emoji: "🌮",
    },
  ]);

  const [recentHangs, setRecentHangs] = useState([
    {
      id: 3,
      title: "Morning Surf Session",
      subtitle: "4 arrived on time",
      avatars: [imgAvatar5, imgAvatar6],
      icon: "✓",
    },
  ]);

    const insets = useSafeAreaInsets();


    const gradientColors = ['#F7FBF8', '#CBE2D3', '#A1C2A8'];

  return (
    <LinearGradient
    colors={gradientColors}
    start={{ x: 0.15, y: 0 }}
    end={{ x: 1, y: 0.85 }}
    style={{ flex: 1, paddingTop: insets.top }}
    >
      {/* Header */}
        <View className="px-4 pt-10 pb-4">
            <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-gray-900">Create Hang</Text>
            <View className="flex-row gap-3">
                {/* Search Button */}
                <Pressable className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm">
                    <MaterialIcons name="search" size={24} color="#374151" />
                </Pressable>
                {/* Map Button */}
                <Pressable className="bg-white border border-gray-300 rounded-full w-12 h-12 items-center justify-center shadow-sm">
                    <MaterialIcons name="map" size={24} color="#374151" />
                </Pressable>
            </View>
            </View>
        </View>

        <Image
            pointerEvents="none"
            source={mascotImage }
            resizeMode="contain"
            style={styles.bgMascot}
        />

        <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1"
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
       >
        {/* Upcoming Section */}
        <View className="px-4 mt-6">
            <View className="flex-row items-center px-1 mb-3">
                <Text className="text-sm font-bold text-blue-900 tracking-wider uppercase">
                Upcoming
                </Text>
             </View>

          {/* Upcoming Cards */}
          <View className="gap-3">
            {upcomingHangs.map((hang) => (
              <Pressable
                key={hang.id}
                className="bg-[#CFEAEC] border border-cyan-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <MaterialIcons name="more-horiz" size={20} color="#334155" />
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-700">
                      {hang.title} {hang.emoji}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {hang.date} • {hang.time}
                    </Text>
                  </View>
                </View>

                {/* Avatar Group */}
                <View className="flex-row items-center gap-1 ml-4">
                  {hang.avatars.map((avatar, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: avatar }}
                      className="w-7 h-7 rounded-full border-2 border-white bg-gray-200"
                      style={{ marginLeft: idx > 0 ? -8 : 0 }}
                    />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Section */}
        <View className="px-4 mt-6 pb-32">
          <View className="px-1 mb-3">
            <Text className="text-sm font-bold text-gray-500 tracking-wider uppercase">
              Recent
            </Text>
          </View>

          {/* Recent Cards */}
          <View className="gap-3">
            {recentHangs.map((hang) => (
              <Pressable
                key={hang.id}
                className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <MaterialIcons name="check-circle" size={20} color="#10b981" />
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-700">
                      {hang.title}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {hang.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Avatar Group */}
                <View className="flex-row items-center gap-1 ml-4">
                  {hang.avatars.map((avatar, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: avatar }}
                      className="w-7 h-7 rounded-full border-2 border-white bg-gray-200"
                      style={{ marginLeft: idx > 0 ? -8 : 0 }}
                    />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

        {/* FAB Button */}
        <Pressable className="absolute bottom-24 right-5 bg-cyan-200 border border-cyan-300 rounded-full w-16 h-16 items-center justify-center shadow-lg">
            <MaterialIcons name="add" size={32} color="#4b7f6b" />
        </Pressable>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  bgMascot: {
    position: "absolute",
    left: "50%",
    bottom: 120,           // a little lower; keep nav spacing feel
    width: 220,
    height: 220,
    transform: [{ translateX: -110 }], // half of width
    opacity: 1,
  },
});
