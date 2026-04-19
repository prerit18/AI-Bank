"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Customer } from "@/lib/api";

interface SessionContextValue {
  customer: Customer | null;
  setCustomer: (c: Customer | null) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  customer: null,
  setCustomer: () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomerState] = useState<Customer | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("ai_bank_customer");
    if (stored) setCustomerState(JSON.parse(stored));
  }, []);

  const setCustomer = (c: Customer | null) => {
    setCustomerState(c);
    if (c) localStorage.setItem("ai_bank_customer", JSON.stringify(c));
    else localStorage.removeItem("ai_bank_customer");
  };

  const logout = () => setCustomer(null);

  return (
    <SessionContext.Provider value={{ customer, setCustomer, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
