import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifySessionValue } from "@/lib/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (verifySessionValue(session)) {
    redirect("/dashboard");
  }

  redirect("/login");
}

