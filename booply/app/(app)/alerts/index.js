import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Screen } from "../../../components/ui";
import { Card } from "../../../components/ui";
import { supabase } from "../../../constants/supabase";

export default function Alerts() {
  const [invites, setInvites] = useState([]);

  async function refresh() {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData?.user;
    if (!me?.id) return;

    const res = await supabase
      .from("group_invites")
      .select("id,group_id,from_user,status, groups(name)")
      .eq("to_user", me.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!res.error) setInvites(res.data ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function accept(inv) {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData?.user;
    if (!me?.id) return;

    // 1) mark accepted
    await supabase.from("group_invites").update({ status: "accepted" }).eq("id", inv.id);

    // 2) add to members
    const ins = await supabase
      .from("group_members")
      .insert({ group_id: inv.group_id, user_id: me.id, role: "member", status: "active" });

    // ignore duplicate
    if (ins.error && ins.error.code !== "23505") console.log(ins.error);

    refresh();
  }

  async function reject(inv) {
    await supabase.from("group_invites").update({ status: "rejected" }).eq("id", inv.id);
    refresh();
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pt-14">
          <Text className="text-3xl font-extrabold text-slate-900">Alerts</Text>
          <Text className="mt-2 text-sm text-slate-600">Invites & updates.</Text>

          {invites.length === 0 ? (
            <Text className="mt-6 text-sm text-slate-600">No pending invites.</Text>
          ) : (
            invites.map((inv) => (
              <Card key={inv.id} className="mt-4 bg-white/70">
                <Text className="text-lg font-semibold text-slate-900">{inv.groups?.name ?? "Hang invite"}</Text>
                <Text className="mt-1 text-sm text-slate-600">You were invited to join.</Text>

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={() => accept(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-900 py-3"
                  >
                    <Text className="text-sm font-semibold text-white">Accept</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => reject(inv)}
                    className="flex-1 items-center justify-center rounded-2xl bg-zinc-200 py-3"
                  >
                    <Text className="text-sm font-semibold text-zinc-900">Reject</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}