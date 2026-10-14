import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Credits from "./Credits";
import SignOut from "./SignOut";

/** Reads the session cookie, so it streams in behind the static logo */
async function UserNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return (
    <>
      <nav className="flex gap-4 text-sm">
        <Link href="/" className="hover:text-accent">סטודיו</Link>
        <Link href="/library" className="hover:text-accent">הספרייה שלי</Link>
      </nav>
      <div className="ms-auto flex items-center gap-4 text-sm text-muted">
        <Credits />
        <Link href="/account" className="hover:text-ink">סיסמה</Link>
        <SignOut />
      </div>
    </>
  );
}

export default function Header() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-black tracking-wide" dir="ltr">
          <span className="text-accent">AMIR</span> REMIXES
        </Link>
        <Suspense>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}
