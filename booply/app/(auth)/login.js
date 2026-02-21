import React, { useState } from "react";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";

import { supabase } from "../../constants/supabase";
import { Screen, Title, Label, Input, PrimaryButton, ErrorText } from "../../components/ui";


WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = makeRedirectUri({ useProxy: true });

  async function createSessionFromUrl(url) {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);

    const access_token = params?.access_token;
    const refresh_token = params?.refresh_token;

    if (!access_token || !refresh_token) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;

    return data.session;
  }

  const onGoogleLogin = async () => {
    if (loading) return;
    setErrorMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: "https://www.googleapis.com/auth/calendar.readonly",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      router.replace("/(app)"); // Ensure we're back in the app context for the redirect

      if (error) throw error;
      if (!data?.url) throw new Error("No OAuth URL returned");

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (res.type === "success") {
        await createSessionFromUrl(res.url);
        router.replace("/(app)"); // or let your auth guard redirect
      } else {
        setErrorMsg("Google sign-in was cancelled.");
      }
    } catch (e) {
      setErrorMsg(e?.message ?? "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async () => {
    if (loading) return;
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

      <PrimaryButton
        title={loading ? "Opening Google..." : "Log in with Google"}
        onPress={onGoogleLogin}
        disabled={loading}
      />
    </Screen>
  );
};