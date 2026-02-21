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

// Find a user by email (via profiles table)
export async function findUserByEmail(email) {
  const e = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .ilike("email", e)   // ilike avoids case issues
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Send friend request
export async function sendFriendRequest(toUserId) {
  const me = await getMe();
  if (toUserId === me.id) throw new Error("You can’t add yourself.");

  // If already friends, stop early
  const { data: existingFriend } = await supabase
    .from("friends")
    .select("user_id")
    .eq("user_id", me.id)
    .eq("friend_id", toUserId)
    .maybeSingle();

  if (existingFriend) throw new Error("You’re already friends.");

  const { data: existingReq } = await supabase
  .from("friend_requests")
  .select("status")
  .eq("from_user", me.id)
  .eq("to_user", toUserId)
  .maybeSingle();

  if (existingReq?.status === "accepted") throw new Error("You’re already connected.");

  // Upsert request (if exists, set back to pending)
  const { data, error } = await supabase
    .from("friend_requests")
    .upsert(
      {
        from_user: me.id,
        to_user: toUserId,
        status: "pending",
      },
      { onConflict: "from_user,to_user" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// List incoming friend requests
export async function listIncomingRequests() {
  const me = await getMe();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user, status, created_at")
    .eq("to_user", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Accept friend request: mark accepted + insert mutual friendship rows
export async function acceptFriendRequest(requestId) {
  const me = await getMe();

  const { data: req, error: reqErr } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqErr) throw reqErr;

  // Only accept if it was pending (prevents double-accept)
  const { error: updErr } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updErr) throw updErr;

  // Add both directions (idempotent)
  const { error: frErr } = await supabase
    .from("friends")
    .upsert(
      [
        { user_id: me.id, friend_id: req.from_user },
        { user_id: req.from_user, friend_id: me.id },
      ],
      { onConflict: "user_id,friend_id" }
    );

  if (frErr) throw frErr;

  return true;
}

// List my friends (join to profiles for names)
export async function listMyFriends() {
  const me = await getMe();
  const { data, error } = await supabase
    .from("friends")
    .select("friend_id, profiles ( id, first_name, last_name, email )")
    .eq("user_id", me.id);

  if (error) throw error;

  return (data || [])
    .map((row) => row.profiles)
    .filter(Boolean);
}

// Add a friend to a group (insert into group_members)
export async function addMemberToGroup(groupId, userId) {
  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    ready_state: "getting_ready",
  });
  if (error) throw error;
}

export async function inviteUserToGroup(groupId, toUserId) {
  const me = await getMe();
  if (toUserId === me.id) throw new Error("You can’t invite yourself.");

  // Upsert so re-inviting doesn't crash
  const { data, error } = await supabase
    .from("group_invites")
    .upsert(
      {
        group_id: groupId,
        from_user: me.id,
        to_user: toUserId,
        status: "pending",
      },
      { onConflict: "group_id,to_user" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listIncomingGroupInvites() {
  const me = await getMe();
  const { data, error } = await supabase
    .from("group_invites")
    .select("id, group_id, from_user, status, created_at")
    .eq("to_user", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function acceptGroupInvite(inviteId) {
  const me = await getMe();

  // fetch invite
  const { data: inv, error: invErr } = await supabase
    .from("group_invites")
    .select("*")
    .eq("id", inviteId)
    .single();
  if (invErr) throw invErr;

  // mark accepted (only once)
  const { error: updErr } = await supabase
    .from("group_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId)
    .eq("status", "pending");
  if (updErr) throw updErr;

  // NOW the invitee inserts themselves into group_members (allowed by gm_insert_self)
  const { error: gmErr } = await supabase.from("group_members").insert({
    group_id: inv.group_id,
    user_id: me.id,
    ready_state: "getting_ready",
  });
  if (gmErr) throw gmErr;

  return true;
}

export async function declineGroupInvite(inviteId) {
  const { error } = await supabase
    .from("group_invites")
    .update({ status: "declined" })
    .eq("id", inviteId)
    .eq("status", "pending");
  if (error) throw error;
  return true;
}

export async function listGroupMemberIds(groupId) {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (error) throw error;
  return new Set((data || []).map((r) => r.user_id));
}

export async function listPendingInviteIds(groupId) {
  const { data, error } = await supabase
    .from("group_invites")
    .select("to_user")
    .eq("group_id", groupId)
    .eq("status", "pending");

  if (error) throw error;
  return new Set((data || []).map((r) => r.to_user));
}

export async function ensureProfile() {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData?.user;
  if (!user) throw new Error("Not logged in");

  const email = (user.email || "").toLowerCase();
  const meta = user.user_metadata || {};
  const fullName = meta.full_name || meta.name || "";
  const [first, ...rest] = fullName.split(" ").filter(Boolean);
  const last = rest.join(" ");

  // Keep whatever your schema is; adjust columns as needed
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      first_name: meta.given_name || first || "",
      last_name: meta.family_name || last || "",
      // don't overwrite existing custom fields unless you want to:
      // description: "",
      // preferences: {},
    },
    { onConflict: "id" }
  );

  if (error) throw error;
  return user;
}