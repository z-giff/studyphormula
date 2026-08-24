import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate } from "react-router-dom";

const PENDING_REDIRECT_KEY = "phormula.pendingRedirect";


interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, next?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string, next?: string) => Promise<{ error: any }>;
  signInWithGoogle: (next?: string) => Promise<{ error: any }>;
  signInWithApple: (next?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // After an OAuth redirect the session lands on "/", so send the user to the
    // page they originally asked for once we know they're signed in.
    const consumePendingRedirect = (session: Session | null) => {
      if (!session) return;
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem(PENDING_REDIRECT_KEY);
        if (pending) sessionStorage.removeItem(PENDING_REDIRECT_KEY);
      } catch {
        /* ignore storage failures */
      }
      if (pending && pending.startsWith("/") && !pending.startsWith("//")) {
        navigate(pending, { replace: true });
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === "SIGNED_IN") consumePendingRedirect(session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      consumePendingRedirect(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  const safeNext = (next?: string) => {
    if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
    return next;
  };

  const signUp = async (email: string, password: string, fullName: string, next?: string) => {
    const target = safeNext(next);
    const redirectUrl = `${window.location.origin}${target}`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (!error) {
      navigate(target);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string, next?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      navigate(safeNext(next));
    }
    
    return { error };
  };

  const signInWithProvider = async (provider: "google" | "apple", next?: string) => {
    // Remember where the user wanted to go; the OAuth redirect must land on a
    // public same-origin URL, never directly on a protected route.
    try {
      sessionStorage.setItem(PENDING_REDIRECT_KEY, safeNext(next));
    } catch {
      /* ignore storage failures */
    }

    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      return { error: result.error };
    }

    if (result.redirected) {
      // Browser is navigating to the provider.
      return { error: null };
    }

    // Popup flow: session is already set — go to the intended destination.
    navigate(safeNext(next));
    return { error: null };
  };

  const signInWithGoogle = (next?: string) => signInWithProvider("google", next);
  const signInWithApple = (next?: string) => signInWithProvider("apple", next);



  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const value = {
    user,
    session,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
