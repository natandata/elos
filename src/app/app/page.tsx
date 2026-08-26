import { redirect } from "next/navigation";
import { homeFor, requireProfile } from "@/lib/auth";

export default async function AppIndex() {
  const { profile } = await requireProfile();
  redirect(homeFor(profile.role));
}
