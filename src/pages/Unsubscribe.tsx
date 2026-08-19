import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import LogoOrb from "@/components/LogoOrb";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "confirmed" | "error">("loading");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: supabaseAnonKey } }
        );
        if (response.ok) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validate();
  }, [token, supabaseUrl, supabaseAnonKey]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("loading");
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      setStatus("confirmed");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 flex items-center justify-between py-4">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 pt-24">
        <Card className="w-full max-w-md border-border bg-card/85 shadow-[var(--shadow-card)] backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-foreground font-light tracking-wide text-xl">
              Email preferences
            </CardTitle>
            <CardDescription className="text-muted-foreground font-light">
              Manage your Phormula email subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            {status === "loading" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground font-light text-sm">Checking your link...</p>
              </div>
            )}

            {status === "valid" && (
              <div className="space-y-6">
                <p className="text-foreground font-light">
                  You are about to unsubscribe from Phormula emails.
                </p>
                <Button variant="brand" onClick={handleConfirm} className="w-full font-bold">
                  Confirm unsubscribe
                </Button>
              </div>
            )}

            {status === "invalid" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <XCircle className="w-10 h-10 text-muted-foreground" />
                <p className="text-foreground font-light">
                  This unsubscribe link is invalid or has already been used.
                </p>
              </div>
            )}

            {status === "confirmed" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <CheckCircle2 className="w-10 h-10 text-success" />
                <p className="text-foreground font-light">
                  You have been unsubscribed. You will no longer receive emails from Phormula.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <XCircle className="w-10 h-10 text-muted-foreground" />
                <p className="text-foreground font-light">
                  Something went wrong. Please try again later.
                </p>
                <Button variant="outline" onClick={handleConfirm} className="mt-2">
                  Try again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Unsubscribe;
