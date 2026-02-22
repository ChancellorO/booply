import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";
import {
  findUserByEmail,
  sendFriendRequest,
  listIncomingRequests,
  acceptFriendRequest,
  listMyFriends,
  getMe,
} from "../../constants/db";
import { supabase } from "../../constants/supabase";

export default function Friends() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [incoming, setIncoming] = useState([]);
  const [friends, setFriends] = useState([]);

  const refresh = async () => {
    try {
      const reqs = await listIncomingRequests();
      setIncoming(reqs);
      const f = await listMyFriends();
      setFriends(f);
    } catch (e) {
      console.log(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAdd = async () => {
    setErr("");
    setInfo("");

    try {
      const me = await getMe();
      const user = await findUserByEmail(email);

      if (!user) throw new Error("No user found with that email.");
      if (user.id === me.id) throw new Error("You can’t add yourself.");

      await sendFriendRequest(user.id);

      const { data, error } = await supabase.functions.invoke("send_push_invite", {
        body: {
          to_user_id: user.id,
          title: "New Friend Request",
          body: `${me.first_name} sent you a friend request 👋`
        }
      });

      if (error) {
        console.log("Push invite error:", error);
      }

      setInfo("Friend request sent ✅");
      setEmail("");
      await refresh();

    } catch (e) {
      setErr(e?.message ?? "Failed to send request.");
    }
  };

  return (
    <Screen>
      <Title>Friends</Title>

      <Label>Add friend by email</Label>
      <Input
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="friend@email.com"
      />

      <ErrorText>{err}</ErrorText>
      {info ? <Text className="mt-2 text-sm text-green-600">{info}</Text> : null}

      <PrimaryButton title="Send request" onPress={onAdd} disabled={!email.trim()} />

      <Text className="mt-8 text-sm font-semibold text-zinc-700">Incoming requests</Text>
      <View className="mt-3 gap-2">
        {incoming.map((r) => (
          <Pressable
            key={r.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
            onPress={async () => {
              await acceptFriendRequest(r.id);
              await refresh();
            }}
          >
            <Text className="text-base font-semibold text-zinc-900">Accept request</Text>
            <Text className="mt-1 text-xs text-zinc-500">From: {r.from_user}</Text>
          </Pressable>
        ))}
        {incoming.length === 0 ? (
          <Text className="text-sm text-zinc-500">No requests</Text>
        ) : null}
      </View>

      <Text className="mt-8 text-sm font-semibold text-zinc-700">Your friends</Text>
      <View className="mt-3 gap-2">
        {friends.map((f) => (
          <View key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <Text className="text-base font-semibold text-zinc-900">
              {f.first_name} {f.last_name}
            </Text>
            <Text className="mt-1 text-sm text-zinc-600">{f.email}</Text>
          </View>
        ))}
        {friends.length === 0 ? <Text className="text-sm text-zinc-500">No friends yet</Text> : null}
      </View>
    </Screen>
  );
}