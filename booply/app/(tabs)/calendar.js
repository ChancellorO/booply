import { View, Text } from "react-native";
import { Screen, Title } from "@/components/ui";
import { useProfile } from "../../context/ProfileContext";

const Calendar = () => {
  const { profile } = useProfile();
  // get events for the day
  const events = [];
  
  return (
    <Screen>
      <Title>Google Calendar API Test</Title>
      <View className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        {profile ? (
          <Text className="mt-2 text-base font-semibold text-zinc-900">
            {profile.first_name} {profile.last_name}
          </Text>) 
          :
          (<Text className="mt-2 text-base font-semibold text-zinc-900">
            No events data available
          </Text>)
        }
      </View>
    </Screen>
  );
};

export default Calendar;