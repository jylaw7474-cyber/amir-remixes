"use client";

import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      className="hover:text-ink"
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      יציאה
    </button>
  );
}
