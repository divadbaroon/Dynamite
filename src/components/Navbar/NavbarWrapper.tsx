import { createClient } from "@/utils/supabase/server";
import Navbar from "./Navbar";

export default async function NavbarWrapper() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Navbar user={user} />;
}