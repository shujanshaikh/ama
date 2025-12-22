import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { LogIn, LogOut } from 'lucide-react';

// Inline type to avoid importing from @workos-inc/node (Node.js-only package)
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export default function SignInButton({ large, user, url }: { large?: boolean; user: User | null; url: string }) {
  if (user) {
    return (
      <Button asChild variant="outline" size={large ? 'lg' : 'default'}>
        <Link to="/" className="flex items-center gap-2">
          <LogOut className="size-4" />
          Sign Out
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size={large ? 'lg' : 'default'}
      className="flex items-center gap-2"
    >
      <a href={url}>
        <LogIn className="size-4" />
        Sign In{large && ' with AuthKit'}
      </a>
    </Button>
  );
}