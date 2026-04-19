"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { customer } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (customer === null) {
      const stored = localStorage.getItem("ai_bank_customer");
      if (!stored) router.push("/login");
    }
  }, [customer, router]);

  if (!customer) return null;
  return <>{children}</>;
}
