import React, { useState, useMemo, useEffect } from "react";
import { View, Text } from "react-native";

const startMs = (e) => {
  const s = e.start.dateTime ?? e.start.date;
  return s ? new Date(s).getTime() : Number.POSITIVE_INFINITY;
}

const endMs = (e) => {
  const s = e.end.dateTime ?? e.end.date;
  return s ? new Date(s).getTime() : Number.POSITIVE_INFINITY;
}

const formatStartsIn = (ms) => {
  if (ms <= 0) return "Starting now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m ${String(seconds).padStart(2, "0")}s`;
}


const Events = () => {
  // TBD: uncomment this when we hv the acc calendar API data
  // const { profile, events } = useProfile();

  // mock data
  const events = [
    {
      "id": "event_1",
      "status": "confirmed",
      "htmlLink": "https://www.google.com/calendar/event?eid=abc123",
      "created": "2026-02-21T14:12:00.000Z",
      "updated": "2026-02-21T14:12:00.000Z",
      "summary": "Standup",
      "description": "Daily team sync",
      "location": "Zoom",
      "start": {
        "dateTime": "2026-02-21T09:00:00-05:00",
        "timeZone": "America/New_York"
      },
      "end": {
        "dateTime": "2026-02-21T09:30:00-05:00",
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
        "dateTime": "2026-02-21T13:00:00-05:00"
      },
      "end": {
        "dateTime": "2026-02-21T14:00:00-05:00"
      }
    },
    {
      "id": "event_3",
      "status": "confirmed",
      "summary": "Gym",
      "start": {
        "dateTime": "2026-02-21T18:30:00-05:00"
      },
      "end": {
        "dateTime": "2026-02-21T19:30:00-05:00"
      }
    }
  ];

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => startMs(a) - startMs(b));
  }, [events]);

  const nextEvent = useMemo(() => {
    return sortedEvents.find((e) => startMs(e) > now) ?? null;
  }, [sortedEvents, now]);

  const nextEventId = nextEvent?.id ?? null;

  return (
    <View>
      <Text className="text-xl font-bold">Events</Text>
      <View>
        {sortedEvents.map((event) => {
          const isNext = event.id === nextEventId;
          const msUntilStart = startMs(event) - now;

          return (
            <View key={event.id} className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-base font-semibold text-zinc-900">
                  {event.summary ?? "(untitled)"}
                </Text>

                {isNext ? (
                  <View className="rounded-full bg-zinc-900 px-3 py-1">
                    <Text className="text-xs font-semibold text-white">
                      {formatStartsIn(msUntilStart)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text className="mt-2 text-sm text-zinc-700">
                {new Date(event.start.dateTime ?? event.start.date ?? "").toLocaleString()}{" "}
                -{" "}
                {new Date(event.end.dateTime ?? event.end.date ?? "").toLocaleString()}
              </Text>

              {event.location ? (
                <Text className="text-sm text-zinc-500">{event.location}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default Events;