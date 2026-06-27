import create from "zustand";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuthUser = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
};

type AuthProfile = {
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
} | null;

export type AuthPayload = {
  user: AuthUser;
  profile: AuthProfile;
  roles: string[];
};

type AuthState = {
  auth: AuthPayload | null;
  loading: boolean;
  setAuth: (auth: AuthPayload | null) => void;
  fetchCurrentUser: () => Promise<AuthPayload | null>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  auth: null,
  loading: false,
  setAuth: (auth) => set({ auth }),
  fetchCurrentUser: async () => {
    set({ loading: true });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        set({ auth: null });
        return null;
      }

      const auth = (await response.json()) as AuthPayload;
      set({ auth });
      return auth;
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      set({ auth: null });
    }
  },
}));

export default useAuthStore;
