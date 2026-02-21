import { View, Text } from "react-native";
import { Screen, Title } from "@/components/ui";
import { useProfile } from "../../context/ProfileContext";

const Calendar = () => {
  // TBD: uncomment this when we hv the acc calendar API data
  // const { profile, events } = useProfile();
  const { profile } = useProfile();

  // mock data
  const events = [
    {
      "id": "event_1",
      "status": "confirmed",
      "htmlLink": "https://www.google.com/calendar/event?eid=abc123",
      "created": "2026-02-20T14:12:00.000Z",
      "updated": "2026-02-20T14:12:00.000Z",
      "summary": "Standup",
      "description": "Daily team sync",
      "location": "Zoom",
      "start": {
        "dateTime": "2026-02-20T09:00:00-05:00",
        "timeZone": "America/New_York"
      },
      "end": {
        "dateTime": "2026-02-20T09:30:00-05:00",
        "timeZone": "America/New_York"
      },
      "attendees": [
        {
          "email": "venetia@nyu.edu",
          "self": true,
          "responseStatus": "accepted"
        },
        {
          "email": "taneim@company.com",
          "responseStatus": "accepted"
        }
      ],
      "organizer": {
        "email": "taneim@company.com",
        "displayName": "Taneim"
      }
    },
    {
      "id": "event_2",
      "status": "confirmed",
      "summary": "Product Design Review",
      "location": "Room 402",
      "start": {
        "dateTime": "2026-02-20T13:00:00-05:00"
      },
      "end": {
        "dateTime": "2026-02-20T14:00:00-05:00"
      }
    },
    {
      "id": "event_3",
      "status": "confirmed",
      "summary": "Gym",
      "start": {
        "dateTime": "2026-02-20T18:30:00-05:00"
      },
      "end": {
        "dateTime": "2026-02-20T19:30:00-05:00"
      }
    }
  ];

  const sortedEvents = [...events].sort((a, b) => {
    const aStart = new Date(a.start.dateTime || a.start.date).getTime();
    const bStart = new Date(b.start.dateTime || b.start.date).getTime();
    return aStart - bStart; // ascending
  });
  
  return (
    <Screen>
      <Title>Events</Title>
      <Text className="mt-2 text-sm text-zinc-500">
        Your calendar events fetched from the Google Calendar API!
      </Text>
      <View>
        {sortedEvents.map((event) => (
          <View key={event.id} className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <Text className="text-base font-semibold text-zinc-900">{event.summary}</Text>
            <Text className="text-sm text-zinc-700">
              {new Date(event.start.dateTime).toLocaleString()} - {new Date(event.end.dateTime).toLocaleString()}
            </Text>
            <Text className="text-sm text-zinc-500">{event.location}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
};

export default Calendar;