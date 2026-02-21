import { supabase } from "./supabase";

export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Not logged in");
  return data.user;
}

// Create group + add creator as member
export async function createGroup(name) {
  const me = await getMe();

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .insert({ name: name.trim(), created_by: me.id })
    .select()
    .single();

  if (groupErr) throw groupErr;

  const { error: memberErr } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: me.id,
    ready_state: "getting_ready",
  });

  if (memberErr) throw memberErr;

  return group;
}

// List my groups via membership
export async function listMyGroups() {
  const me = await getMe();

  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, groups ( id, name, created_at, created_by )")
    .eq("user_id", me.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => row.groups).filter(Boolean);
}

// List members in a group (hackathon mode: may require permissive RLS or view/RPC later)
export async function listGroupMembers(groupId) {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, ready_state, updated_at, profiles ( first_name, last_name )")
    .eq("group_id", groupId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Save a meetup place for group
export async function saveMeetup(groupId, { name, lat, lng, radius_m }) {
  const { data, error } = await supabase
    .from("group_places")
    .insert({
      group_id: groupId,
      kind: "meetup",
      name: name || "Meetup",
      lat,
      lng,
      radius_m: radius_m ?? 150,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestMeetup(groupId) {
  const { data, error } = await supabase
    .from("group_places")
    .select("*")
    .eq("group_id", groupId)
    .eq("kind", "meetup")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function setMyReadyState(groupId, readyState) {
  const me = await getMe();
  const { error } = await supabase
    .from("group_members")
    .update({ ready_state: readyState, updated_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", me.id);

  if (error) throw error;
}