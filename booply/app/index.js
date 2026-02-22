// app/index.js

import { Redirect } from "expo-router";
import { useSession } from "../hooks/useSession";
import registerNNPushToken from "native-notify";

export default function Index() {
  registerNNPushToken(33414, 'VCNk6PCfpUyNhEIpG70WXC');
  const { session, loading } = useSession();
  if (loading) return null;

  return session
    ? <Redirect href="/(tabs)/hangs" />
    : <Redirect href="/(auth)" />;
}