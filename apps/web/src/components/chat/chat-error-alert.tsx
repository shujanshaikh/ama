import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChatErrorAlertProps {
  error: Error | string | null;
  onDismiss: () => void;
  onRetry: () => void;
}

export function ChatErrorAlert({ error, onDismiss, onRetry }: ChatErrorAlertProps) {
  if (!error) return null;

  return (
    <div className="flex justify-center mb-2">
      <div className="w-[90%]">
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="flex-1 text-xs">
              {error instanceof Error ? error.message : String(error)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-6 px-2 text-xs"
              >
                Retry
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDismiss}
                className="h-6 w-6"
                aria-label="Dismiss error"
              >
                <XIcon className="size-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

