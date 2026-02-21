// app/index.js

import { Redirect } from "expo-router";
import { useSession } from "../hooks/useSession";

export default function Index() {
  const { session, loading } = useSession();
  if (loading) return null;

  return session
    ? <Redirect href="/(tabs)/hangs" />
    : <Redirect href="/(auth)" />;
}