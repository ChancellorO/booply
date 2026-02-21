import * as Location from "expo-location";
import { supabase } from "./supabase";

export async function updateMyGroupLocation(groupId) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.id) return;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const patch = {
    last_lat: pos.coords.latitude,
    last_lng: pos.coords.longitude,
    last_loc_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("group_members")
    .update(patch)
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) throw error;

  return patch;
}