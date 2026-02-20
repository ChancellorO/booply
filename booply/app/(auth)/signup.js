import { useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../constants/supabase";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";
import { TextInput } from "react-native";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [description, setDescription] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignup = async () => {
    setErrorMsg("");
    setLoading(true);

    // 1) Create auth account
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    // If email confirmations are OFF, you should get a session immediately.
    // If session is null, confirmations are probably still ON.
    const userId = data?.user?.id;
    if (!userId) {
      setLoading(false);
      setErrorMsg("Signup succeeded but user id is missing. Check Supabase email confirmation setting.");
      return;
    }

    // 2) Insert profile info
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      description: description.trim(),
      preferences: {}, // keep empty for now
    });

    setLoading(false);

    if (profileErr) {
      setErrorMsg(profileErr.message);
      return;
    }

    router.replace("/(app)");
  };

  return (
    <Screen>
      <Title>Sign up</Title>

      <Label>First name</Label>
      <Input value={firstName} onChangeText={setFirstName} />

      <Label>Last name</Label>
      <Input value={lastName} onChangeText={setLastName} />

      <Label>Description</Label>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Say a bit about yourself"
        placeholderTextColor="#9CA3AF"
        multiline
        className="mt-2 h-28 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900"
        style={{ textAlignVertical: "top" }}
      />

      <Label>Email</Label>
      <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Label>Password</Label>
      <Input value={password} onChangeText={setPassword} secureTextEntry />

      <ErrorText>{errorMsg}</ErrorText>

      <PrimaryButton
        title={loading ? "Creating..." : "Create account"}
        onPress={onSignup}
        disabled={loading || !email || !password || !firstName || !lastName}
      />
    </Screen>
  );
}