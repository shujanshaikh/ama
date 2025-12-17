import { createFileRoute } from "@tanstack/react-router";
import { useAuthStatus } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const { user, isLoading, isAuthenticated, signIn, signUp, signOut } = useAuthStatus();



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to AMA</CardTitle>
            <CardDescription>
              Sign in to access your AI-powered development assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={signIn}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
            <Button
              onClick={signUp}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profilePictureUrl || undefined} alt={user.firstName || 'User'} />
              <AvatarFallback className="text-lg">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>
                Welcome back{user.firstName && `, ${user.firstName}`}!
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">Account Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-xs break-all">{user.id}</span>
              <span className="text-muted-foreground">Email Verified:</span>
              <span>{user.emailVerified ? '✅ Yes' : '❌ No'}</span>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
