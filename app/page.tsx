"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTokenValue } from "@/lib/api-client";
import { Loader } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getTokenValue();
    if (token) {
      router.replace("/tenants");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader size={24} className="animate-spin text-slate-500" />
    </div>
  );
}
