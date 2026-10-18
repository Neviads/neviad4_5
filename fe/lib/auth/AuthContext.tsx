"use client";

import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  contactInfo?: string | null;
  bio?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  role: string;
  roles: string[];
  subject: string | null;
  grades?: number[];
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  status: "anonymous",
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
});

export function useAuth() {
  return useContext(AuthContext);
}
