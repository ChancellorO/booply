import { Link } from "expo-router";
import { Screen, Title, PrimaryButton, SecondaryButton } from "../../components/ui";

export default function AuthLanding() {
  return (
    <Screen>
      <Title>Booply</Title>

      <Link href="/(auth)/login" asChild>
        <PrimaryButton title="Log in" />
      </Link>

      <Link href="/(auth)/signup" asChild>
        <SecondaryButton title="Sign up" />
      </Link>
    </Screen>
  );
}