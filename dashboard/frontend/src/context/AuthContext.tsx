import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AuthService } from '@/services/auth.service';
import type {
  IAuthUser,
  LoginInput,
  StudentRegisterInput,
  TeacherRegisterInput,
  UserRole,
} from '@/types/auth.types';

interface AuthContextValue {
  user: IAuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (input: LoginInput) => Promise<IAuthUser>;
  registerStudent: (input: StudentRegisterInput) => Promise<IAuthUser>;
  registerTeacher: (input: TeacherRegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Attempt automatic session restoration on app load.
  // Priority: 1) In-memory header (already set), 2) localStorage token backup,
  // 3) httpOnly refresh cookie via /auth/refresh.
  const refreshUser = useCallback(async () => {
    // Restore the access token from localStorage if the in-memory header was
    // lost due to a full page reload (e.g. returning from Smart Board new-tab).
    try {
      const storedToken = localStorage.getItem('eduverse_token');
      if (storedToken) {
        AuthService.setAuthHeader(storedToken);
      }
    } catch (_) {}

    try {
      const data = await AuthService.getMe();
      setUser(data.user);
    } catch {
      // Token may be expired — try refresh endpoint once (uses httpOnly cookie).
      try {
        const refreshData = await AuthService.refresh();
        setUser(refreshData.user);
      } catch {
        // Both failed — clear stale token and treat as unauthenticated.
        setUser(null);
        AuthService.setAuthHeader(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput): Promise<IAuthUser> => {
    setLoading(true);
    try {
      const data = await AuthService.login(input);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const registerStudent = async (input: StudentRegisterInput): Promise<IAuthUser> => {
    setLoading(true);
    try {
      const data = await AuthService.registerStudent(input);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const registerTeacher = async (input: TeacherRegisterInput): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.registerTeacher(input);
      // Teacher account starts PENDING, so user remains unauthenticated until approved
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    role: user ? user.role : null,
    login,
    registerStudent,
    registerTeacher,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
