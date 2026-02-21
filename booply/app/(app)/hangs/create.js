import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../../components/ui";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { supabase } from "../../../constants/supabase";

export default function CreateHang() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user?.id) return;

      // 1) create group draft
      const g = await supabase
        .from("groups")
        .insert({ name: name.trim() || "New Hang", created_by: user.id, locked: false })
        .select()
        .single();

      if (g.error) throw g.error;

      // 2) add creator as member/owner
      const m = await supabase
        .from("group_members")
        .insert({ group_id: g.data.id, user_id: user.id, role: "owner", status: "active" });

      if (m.error) throw m.error;

      router.replace(`/(app)/hangs/${g.data.id}/details`);
    } catch (e) {
      console.log("create hang error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="px-6 pt-14">
        <Text className="text-3xl font-extrabold text-slate-900">New Hang</Text>
        <Text className="mt-2 text-sm text-slate-600">
          Create it first, then set time & location (locked after).
        </Text>

        <View className="mt-6 rounded-2xl bg-white/70 px-4 py-4">
          <Text className="text-xs font-semibold text-slate-500">Hang name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Taco Tuesday 🌮"
            placeholderTextColor="#94A3B8"
            className="mt-2 text-lg font-semibold text-slate-900"
          />
        </View>

        <PrimaryButton
          title={loading ? "Creating..." : "Create"}
          onPress={onCreate}
          disabled={loading}
          className="mt-6"
        />
      </View>
    </Screen>
  );
}