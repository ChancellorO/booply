import { supabase } from "./supabase";

/** -------------------------
 * Auth helpers
 * ------------------------*/
export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Not logged in");
  return data.user;
}

export async function setRandomScore(userId) {  
  
  const randomScore = Math.floor(Math.random() * 1000); // Random score between 0 and 999
  console.log(`Setting random punctuality score for user ${userId}: ${randomScore}`);
  const { data, error } = await supabase
    .from("profiles")
    .update({ punctuality_score: randomScore })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};


/** -------------------------
 * Groups / Hangs
 * ------------------------*/

// Create a group + add creator as member (draft by default)
export async function createGroup(name, { start_time = null, locked = false } = {}) {
  const me = await getMe();

  const payload = {
    name: (name || "New Hang").trim(),
    created_by: me.id,
    locked,
  };

  if (start_time) {
    payload.start_time = start_time instanceof Date ? start_time.toISOString() : start_time;
  }

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .insert(payload)
    .select("id,name,created_by,created_at,start_time,locked")
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

// Lock/unlock a group
export async function setGroupLocked(groupId, locked) {
  const { data, error } = await supabase
    .from("groups")
    .update({ locked })
    .eq("id", groupId)
    .select("id,locked")
    .single();

  if (error) throw error;
  return data;
}

// List my groups via membership
export async function listMyGroups() {
  const me = await getMe();

  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, groups ( id, name, start_time, created_at, created_by, locked )")
    .eq("user_id", me.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => row.groups).filter(Boolean);
}

// Get a single group by id
export async function getGroup(groupId) {
  const { data, error } = await supabase
    .from("groups")
    .select("id,name,start_time,created_at,created_by,locked")
    .eq("id", groupId)
    .single();

  if (error) throw error;
  return data;
}

/** -------------------------
 * Group members
 * ------------------------*/

// List members in a group
export async function listGroupMembers(groupId) {
  const { data, error } = await supabase
    .from("group_members")
    .select(
      "user_id, ready_state, updated_at, last_lat, last_lng, profiles ( first_name, last_name, avatar_url )"
    )
    .eq("group_id", groupId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Update my ready state
export async function setMyReadyState(groupId, readyState) {
  const me = await getMe();
  const { error } = await supabase
    .from("group_members")
    .update({ ready_state: readyState, updated_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", me.id);

  if (error) throw error;
}

export async function sendNudge(groupId, toUserId) {
  const me = await getMe();

  const { error } = await supabase.from("messages").insert({
    group_id: groupId,
    user_id: me.id,
    // hackathon-friendly payload
    text: `NUDGE:${toUserId}`,
  });

  if (error) throw error;
}

// Add member to group (used when accepting invite)
export async function addMemberToGroup(groupId, userId) {
  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    ready_state: "getting_ready",
  });
  if (error) throw error;
}

export async function listGroupMemberIds(groupId) {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (error) throw error;
  return new Set((data || []).map((r) => r.user_id));
}

/** -------------------------
 * Group places (meetup lives here)
 * ------------------------*/

// UPSERT meetup place for group (requires unique index on (group_id, kind))
export async function saveMeetup(groupId, { name, lat, lng, radius_m = 150 }) {
  const payload = {
    group_id: groupId,
    kind: "meetup",
    name: name || "Meetup",
    lat: Number(lat),
    lng: Number(lng),
    radius_m: Number(radius_m),
  };

  const { data, error } = await supabase
    .from("group_places")
    .upsert(payload, { onConflict: "group_id,kind" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMeetup(groupId) {
  const { data, error } = await supabase
    .from("group_places")
    .select("id,group_id,kind,name,lat,lng,radius_m,created_at")
    .eq("group_id", groupId)
    .eq("kind", "meetup")
    .maybeSingle();

  if (error) throw error;
  return data;
}

// (Backwards compatible name)
export async function getLatestMeetup(groupId) {
  return getMeetup(groupId);
}

/** -------------------------
 * Profiles / lookup
 * ------------------------*/

export async function findUserByEmail(email) {
  const e = (email || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .ilike("email", e)
    .maybeSingle();

  if (error) throw error;
  return data;
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

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      first_name: meta.given_name || first || "",
      last_name: meta.family_name || last || "",
    },
    { onConflict: "id" }
  );

  if (error) throw error;
  return user;
}

/** -------------------------
 * Friends
 * ------------------------*/

export async function sendFriendRequest(toUserId) {
  const me = await getMe();
  if (toUserId === me.id) throw new Error("You can’t add yourself.");

  // stop early if already friends
  const { data: existingFriend, error: frErr } = await supabase
    .from("friends")
    .select("user_id")
    .eq("user_id", me.id)
    .eq("friend_id", toUserId)
    .maybeSingle();

  if (frErr) throw frErr;
  if (existingFriend) throw new Error("You’re already friends.");

  // stop early if request already accepted
  const { data: existingReq, error: reqErr } = await supabase
    .from("friend_requests")
    .select("status")
    .eq("from_user", me.id)
    .eq("to_user", toUserId)
    .maybeSingle();

  if (reqErr) throw reqErr;
  if (existingReq?.status === "accepted") throw new Error("You’re already connected.");

  // Upsert request back to pending
  const { data, error } = await supabase
    .from("friend_requests")
    .upsert(
      { from_user: me.id, to_user: toUserId, status: "pending" },
      { onConflict: "from_user,to_user" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listIncomingRequests() {
  const me = await getMe();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, from_user, to_user, status, created_at")
    .eq("to_user", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function acceptFriendRequest(requestId) {
  const me = await getMe();

  const { data: req, error: reqErr } = await supabase
    .from("friend_requests")
    .select("id, from_user, to_user, status")
    .eq("id", requestId)
    .single();

  if (reqErr) throw reqErr;

  const { error: updErr } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updErr) throw updErr;

  const { error: frErr } = await supabase.from("friends").upsert(
    [
      { user_id: me.id, friend_id: req.from_user },
      { user_id: req.from_user, friend_id: me.id },
    ],
    { onConflict: "user_id,friend_id" }
  );

  if (frErr) throw frErr;
  return true;
}

export async function listMyFriends() {
  const me = await getMe();

  // This relies on a FK relationship friends.friend_id -> profiles.id in Supabase
  const { data, error } = await supabase
    .from("friends")
    .select("friend_id, profiles ( id, first_name, last_name, email )")
    .eq("user_id", me.id);

  if (error) throw error;

  const list = (data || []).map((row) => row.profiles).filter(Boolean);

  // If join isn't configured properly, list can come back empty even when friends exist.
  // Fallback: fetch profiles by IDs.
  if (list.length === 0 && (data || []).length > 0) {
    const ids = (data || []).map((r) => r.friend_id);
    const p = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", ids);
    if (p.error) throw p.error;
    return p.data || [];
  }

  return list;
}

/** -------------------------
 * Group invites
 * ------------------------*/

export async function inviteUserToGroup(groupId, toUserId) {
  const me = await getMe();
  if (toUserId === me.id) throw new Error("You can’t invite yourself.");

  const { data, error } = await supabase
    .from("group_invites")
    .upsert(
      { group_id: groupId, from_user: me.id, to_user: toUserId, status: "pending" },
      { onConflict: "group_id,to_user" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
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

export async function listIncomingGroupInvites() {
  const me = await getMe();
  const { data, error } = await supabase
    .from("group_invites")
    .select("id, group_id, from_user, to_user, status, created_at")
    .eq("to_user", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function acceptGroupInvite(inviteId) {
  const me = await getMe();

  const { data: inv, error: invErr } = await supabase
    .from("group_invites")
    .select("id, group_id, from_user, to_user, status")
    .eq("id", inviteId)
    .single();

  if (invErr) throw invErr;

  const { error: updErr } = await supabase
    .from("group_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId)
    .eq("status", "pending");

  if (updErr) throw updErr;

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

export async function rejectFriendRequest(requestId) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) throw error;
  return true;
}


export async function getGroupNameById(groupId) {
  const { data, error } = await supabase
    .from("group_places")
    .select("name")
    .eq("group_id", groupId)
    .eq("kind", "meetup")   // ensures you're getting the actual hang name
    .maybeSingle();

  if (error) throw error;

  return data?.name ?? "Hang";
}


export async function getUserNameById(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return "Someone";

  return `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
}

import { sendPushNotifications } from "./pushSend";

export async function notifyGroupSimple(groupId, title, body, data = {}) {
  // 1) get members
  const { data: members, error: mErr } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (mErr) throw mErr;

  const ids = members.map((m) => m.user_id);
  if (!ids.length) return;

  // 2) get tokens
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .in("id", ids);

  if (pErr) throw pErr;

  const tokens = profiles
    .map((p) => p.expo_push_token)
    .filter((t) => t?.startsWith("ExponentPushToken"));

  // 3) send push
  await sendPushNotifications(tokens, title, body, data);
}