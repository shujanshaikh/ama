import { useAuth } from "../hooks/use-auth";
import { AmaLogo } from "@/components/ama-logo";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

export function LoginPage() {
  const { signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      console.error("Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
      {/* Drag region */}
      <div className="drag-region fixed inset-x-0 top-0 h-8" />

      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <AmaLogo size={72} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">ama</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI-powered coding assistant
            </p>
          </div>
        </div>

        {/* Sign in */}
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="min-w-[200px]"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Opening browser...
              </>
            ) : (
              <>
                <ExternalLink className="size-4" />
                Sign in with Browser
              </>
            )}
          </Button>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground/60">
            You'll be redirected to your browser to authenticate
          </p>
        </div>
      </div>
    </div>
  );
}
