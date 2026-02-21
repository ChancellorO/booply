import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  {
    rank: 4,
    id: '6',
    name: 'Stephen',
    handle: 'stephen965107',
    points: 4570,
    avatar: 'https://i.pravatar.cc/150?img=6',
  },
];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = LEADERBOARD_DATA.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.handle.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.rank - b.rank);

  return (
    <LinearGradient
      colors={['#F7FBF8', '#CBE2D3', '#A1C2A8']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 0.85 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
    {/* Header */}
      <View className="px-4 pt-10 pb-4">
        <Text className="text-5xl font-bold text-black tracking-tight">The Bloopies</Text>
        <Text className="text-base text-gray-800 mt-2">Leaderboard</Text>
      </View>

    {/* Filter buttons */}
      <View className="flex-row gap-2 px-4 pb-4">
        {['weekly', 'daily', 'monthly'].map((period) => (
          <Pressable
            key={period}
            onPress={() => setFilter(period)}
            className={`flex-1 rounded-full py-2 px-5 ${
              filter === period
                ? 'bg-teal-600'
                : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-center font-semibold text-base ${
                filter === period ? 'text-white' : 'text-black'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </Pressable>
        ))}
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
          contentContainerStyle={{ paddingBottom: 96 }}
        >

        {/* Leaderboard entries */}
        <View className="px-4 pb-8">
          <View className="gap-2">
            {filteredData.map((entry) => (
              <View
                key={entry.id}
                className="flex-row items-center justify-between bg-white border border-gray-300 rounded-lg p-3"
              >
                {/* Medal emoji and rank */}
                <View className="flex-row items-center gap-3">
                  <Text className="text-xl">🥉</Text>
                  <Text className="text-lg font-semibold text-black">{entry.rank}</Text>
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
