import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";


// Mock leaderboard data
const LEADERBOARD_DATA = [
  {
    rank: 4,
    id: '1',
    name: 'Stephen',
    handle: 'stephen965107',
    points: 4570,
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    rank: 5,
    id: '2',
    name: 'Tony',
    handle: 'tony67510745',
    points: 4570,
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    rank: 6,
    id: '3',
    name: 'Steve',
    handle: 'steve09898921',
    points: 4570,
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    rank: 7,
    id: '4',
    name: 'Bruice',
    handle: 'bruice1119725',
    points: 4570,
    avatar: 'https://i.pravatar.cc/150?img=4',
  },
  {
    rank: 8,
    id: '5',
    name: 'Stephen',
    handle: 'stephen965107',
    points: 4570,
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  const [mode, setMode] = useState('bloopies'); // 'bloopies' | 'ploopies'

  const anim = useRef(new Animated.Value(mode === 'bloopies' ? 0 : 1)).current;

  // smooth toggle effect
  useEffect(() => {
    Animated.timing(anim, {
      toValue: mode === 'bloopies' ? 0 : 1,
      duration: 180,
      useNativeDriver: false, // needed for color interpolation
    }).start();
  }, [mode, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0d9488', '#ef4444'], // teal -> red
  });

  const knobTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22], // knob travel distance
  });

  const activeChipBg = mode === 'bloopies' ? 'bg-teal-600' : 'bg-red-500';
  const activeChipText = 'text-white';

  const PERIODS = ['weekly', 'daily', 'monthly'];
  const periodIndex = PERIODS.indexOf(filter); // 0/1/2
  const periodAnim = useRef(new Animated.Value(periodIndex)).current;
  const [segWidth, setSegWidth] = useState(0);

  useEffect(() => {
    Animated.timing(periodAnim, {
      toValue: periodIndex,
      duration: 180,
      useNativeDriver: true, // translateX only
    }).start();
  }, [periodIndex, periodAnim]);

  const thumbTranslateX = periodAnim.interpolate({
  inputRange: [0, 1, 2],
  outputRange: [0, segWidth, segWidth * 2],
  });

  const activeHex = mode === 'bloopies' ? '#0d9488' : '#ef4444';

  const gradientColors = mode === 'bloopies'
    ? ['#F7FBF8', '#CBE2D3', '#A1C2A8'] // green
    : ['#FFF5F5', '#F7B6B6', '#F08A8A']; // red

  const filteredData = LEADERBOARD_DATA.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )
  .sort((a, b) => {
    if (mode === 'bloopies') return b.points - a.points; // descending
    return a.points - b.points; // ascending
  });

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
        {/* Left: Back + Title */}
        <View className="flex-row items-start gap-3 flex-1">
            <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/70 border border-white/60 items-center justify-center"
            style={{
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
            }}
            hitSlop={10}
            >
            <MaterialIcons name="chevron-left" size={22} color="#0f172a" />
            </Pressable>

            <View>
            <Text className="text-5xl font-bold text-black tracking-tight">
                {mode === "bloopies" ? "Bloopies" : "Ploopies"}
            </Text>
            <Text className="text-base text-gray-800 mt-2">Leaderboard</Text>
            </View>
        </View>

        {/* Right: Wi-Fi style toggle */}
        <Pressable
            onPress={() => setMode(mode === "bloopies" ? "ploopies" : "bloopies")}
            style={{ paddingLeft: 8 }}
        >
            <Animated.View
            style={{
                width: 52,
                height: 30,
                borderRadius: 999,
                padding: 3,
                justifyContent: "center",
                backgroundColor: trackColor,
            }}
            >
            <Animated.View
                style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: "white",
                transform: [{ translateX: knobTranslateX }],
                }}
            />
            </Animated.View>
        </Pressable>
     </View>
    </View>

    {/* Segmented Period Control (animated) */}
    <View className="px-4 pb-4">
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setSegWidth(w / 3);
        }}
        style={{
          height: 44,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.75)',
          borderColor: 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* sliding thumb */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: Math.max(0, segWidth - 4),
            height: 40,
            borderRadius: 999,
            transform: [{ translateX: thumbTranslateX }],
            backgroundColor: activeHex,
          }}
        />

        {/* labels */}
        <View style={{ flexDirection: 'row', height: '100%' }}>
          {PERIODS.map((period) => {
            const selected = filter === period;
            return (
              <Pressable
                key={period}
                onPress={() => setFilter(period)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', color: selected ? 'white' : 'black' }}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>

    {/* Search bar */}
    <View className="px-4 pb-4">
      <View className="flex-row items-center bg-white border border-gray-300 rounded-full px-4 py-3">
        <Text className="text-2xl text-gray-400 mr-2">🔍</Text>
        <TextInput
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 text-base text-black"
          placeholderTextColor="#9f8f8f"
        />
      </View>
    </View>

      <ScrollView
          className="flex-1"
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={{ paddingBottom: 96 + 72 + insets.bottom }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >

        {/* Leaderboard entries */}
        <View className="px-4 pb-8">
          <View className="gap-2">
            {filteredData.map((entry, idx) => (
              <View
                key={entry.id}
                className="flex-row items-center justify-between bg-white border border-gray-300 rounded-lg p-3"
              >
                {/* Medal emoji and rank */}
                <View className="flex-row items-center gap-3">
                  <Text className="text-xl">🥉</Text>
                  <Text className="text-lg font-semibold text-black">{idx + 1}</Text>
                </View>

                {/* Avatar, name, and handle */}
                <View className="flex-1 flex-row items-center gap-3 ml-2">
                  <Image
                    source={{ uri: entry.avatar }}
                    className="w-14 h-14 rounded-full"
                  />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-black">{entry.name}</Text>
                    <Text className="text-sm text-gray-600">{entry.handle}</Text>
                  </View>
                </View>

                {/* Points */}
                <Text className="text-base text-gray-600 font-medium">{entry.points}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}