import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../../components/ui";
import { Card } from "../../../../components/ui";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { supabase } from "../../../../constants/supabase";

export default function InviteFriends() {
  const { id } = useLocalSearchParams();
  const groupId = id;

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  async function inviteByEmail() {
    if (sending) return;
    setSending(true);
    setSentMsg("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData?.user;
      if (!me?.id) return;

      const e = email.trim().toLowerCase();
      if (!e) return;

      // lookup profiles by email (must exist)
      const p = await supabase
        .from("profiles")
        .select("id,email,first_name,last_name")
        .ilike("email", e)
        .maybeSingle();

      if (p.error) throw p.error;
      if (!p.data?.id) {
        setSentMsg("User not found (make sure they signed up).");
        return;
      }
      if (p.data.id === me.id) {
        setSentMsg("You can’t invite yourself.");
        return;
      }

      const ins = await supabase
        .from("group_invites")
        .insert({ group_id: groupId, from_user: me.id, to_user: p.data.id })
        .select()
        .single();

      if (ins.error) {
        // handle duplicate
        if (ins.error.code === "23505") setSentMsg("Invite already sent.");
        else throw ins.error;
      } else {
        setSentMsg("Invite sent ✅");
        setEmail("");
      }
    } catch (e) {
      setSentMsg(e?.message ?? "Invite failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View className="px-6 pt-14">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-base font-semibold text-slate-900">Invite friends</Text>
          <Pressable onPress={() => router.replace(`/(app)/hangs/${groupId}`)} className="h-10 px-2 items-center justify-center">
            <Text className="text-sm font-semibold text-indigo-700">Skip</Text>
          </Pressable>
        </View>

        <Text className="mt-4 text-2xl font-extrabold text-slate-900">Add people</Text>
        <Text className="mt-1 text-sm text-slate-600">
          Send invites. Friends can accept/reject.
        </Text>

        <Card className="mt-6 bg-white/70">
          <Text className="text-xs font-semibold text-slate-500">Invite by email</Text>
          <View className="mt-3 rounded-2xl bg-zinc-100 px-4 py-4">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="friend@email.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              className="text-base text-slate-900"
            />
          </View>

          {sentMsg ? <Text className="mt-3 text-sm text-slate-700">{sentMsg}</Text> : null}

          <PrimaryButton
            title={sending ? "Sending..." : "Send invite"}
            onPress={inviteByEmail}
            disabled={sending || !email.trim()}
            className="mt-4"
          />
        </Card>

        <PrimaryButton
          title="Continue"
          onPress={() => router.replace(`/(app)/hangs/${groupId}`)}
          className="mt-6"
        />
      </View>
    </Screen>
  );
}