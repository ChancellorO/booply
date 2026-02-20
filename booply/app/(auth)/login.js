import { useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../constants/supabase";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // session gate will redirect; but this makes it feel instant:
    router.replace("/(app)");
  };

  return (
    <Screen>
      <Title>Log in</Title>

      <Label>Email</Label>
      <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Label>Password</Label>
      <Input value={password} onChangeText={setPassword} secureTextEntry />

      <ErrorText>{errorMsg}</ErrorText>

      <PrimaryButton
        title={loading ? "Logging in..." : "Log in"}
        onPress={onLogin}
        disabled={loading || !email || !password}
      />
    </Screen>
  );
}