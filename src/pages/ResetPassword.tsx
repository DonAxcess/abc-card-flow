import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const getAuthParams = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const search = new URLSearchParams(window.location.search);

  return {
    errorDescription: hash.get("error_description") || search.get("error_description"),
    hasRecoveryToken:
      hash.has("type") && hash.get("type") === "recovery" ||
      search.has("type") && search.get("type") === "recovery" ||
      hash.has("access_token") ||
      search.has("access_token"),
  };
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Check URL hash/search for recovery params (providers may append either)
    const { errorDescription, hasRecoveryToken } = getAuthParams();
    if (errorDescription) {
      setErrorMessage(errorDescription);
    }

    if (hasRecoveryToken) {
      setReady(true);
    }

    // Also check if we already have a session (user clicked link and was auto-logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/auth");
    }
    setLoading(false);
  }

  if (!ready) {
    if (errorMessage) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Reset link expired</h1>
              <p className="mt-2 text-muted-foreground">{errorMessage}. Request a new password reset email to continue.</p>
            </div>
            <Button type="button" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/auth?forgot=1&reset=expired")}>
              Request a new reset link
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Verifying your reset link…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold">Set New Password</h1>
          <p className="text-muted-foreground mt-1">Enter your new password below.</p>
        </div>
        <form onSubmit={handleReset} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
