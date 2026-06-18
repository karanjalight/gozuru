import { redirect } from "next/navigation";

export default function LegacyClientSignupRedirect() {
  redirect("/auth/client/signup");
}
