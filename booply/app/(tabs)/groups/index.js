import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../../components/ui";
import { createGroup, listMyGroups } from "../../../constants/db";

/** ---------- countdown helpers ---------- */
const startMs = (e) => {
  const s = e.start?.dateTime ?? e.start?.date;
  return s ? new Date(s).getTime() : Number.POSITIVE_INFINITY;
};

const formatStartsIn = (ms) => {
  if (ms <= 0) return "Starting now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

/**
 * Map your "group" row into an "event-like" shape so we can reuse the card UI.
 * Adjust starts_at / location field names here if your DB uses different names.
 */
const groupToEvent = (g) => ({
  id: g.id,
  summary: g.name,
  location: g.location ?? "",
  start: { dateTime: g.starts_at ?? g.start_time ?? g.meet_time ?? null },
  end: { dateTime: g.ends_at ?? null }, // optional
});

export default function Groups() {
  const [name, setName] = useState("");
  const [groups, setGroups] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // live clock for countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    try {
      const g = await listMyGroups();
      setGroups(g);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCreate = async () => {
    setErr("");
    setLoading(true);
    try {
      const group = await createGroup(name);
      setName("");
      await refresh();
      router.push({ pathname: "/(app)/group", params: { groupId: group.id } });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert groups -> event-like objects
  const groupEvents = useMemo(() => groups.map(groupToEvent), [groups]);

  // Sort by start time
  const sorted = useMemo(() => {
    return [...groupEvents].sort((a, b) => startMs(a) - startMs(b));
  }, [groupEvents]);

  // Next upcoming "group event"
  const nextEvent = useMemo(() => {
    return sorted.find((e) => startMs(e) > now) ?? null;
  }, [sorted, now]);

  const nextId = nextEvent?.id ?? null;

  return (
    <Screen>
      <Title>Groups</Title>

      <Label>Create a group</Label>
      <Input value={name} onChangeText={setName} placeholder="Friday night" />

      <ErrorText>{err}</ErrorText>

      <PrimaryButton
        title={loading ? "Creating..." : "Create"}
        onPress={onCreate}
        disabled={loading || !name.trim()}
      />

      <PrimaryButton title="View invites" onPress={() => router.push("/(tabs)/groups/invites")} />

      <View className="mt-8">
        <Text className="text-sm font-semibold text-zinc-700">Your groups (hangs)</Text>

        <View className="mt-3 gap-2">
          {sorted.map((event) => {
            const isNext = event.id === nextId;
            const msUntilStart = startMs(event) - now;

            const startStr = event.start?.dateTime ?? event.start?.date ?? "";

            return (
              <Pressable
                key={event.id}
                className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                onPress={() => router.push({ pathname: "/(app)/group", params: { groupId: event.id } })}
              >
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
                  {startStr ? new Date(startStr).toLocaleString() : "(no time set)"}
                </Text>

                {event.location ? (
                  <Text className="text-sm text-zinc-500">{event.location}</Text>
                ) : null}

                <Text className="mt-1 text-xs text-zinc-500">{event.id}</Text>
              </Pressable>
            );
          })}

          {!sorted.length ? (
            <View className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <Text className="text-sm text-zinc-600">No groups yet.</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}