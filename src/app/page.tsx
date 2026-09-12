/**
 * Root page — redirects authenticated workers to /dashboard,
 * unauthenticated users to /login.
 *
 * This is a Server Component; session check is done server-side
 * using the Supabase server client (cookie-based auth, no client trust).
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
