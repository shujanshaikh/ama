import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, FileDiff } from "lucide-react";

interface ChatStatusBarProps {
  status: 'streaming' | 'submitted' | 'ready' | 'error';
  canUndo: boolean;
  isUndoing: boolean;
  isAccepting: boolean;
  isReviewing: boolean;
  onUndo: () => void;
  onAcceptAll: () => void;
  onReview: () => void;
}

export function ChatStatusBar({
  status,
  canUndo,
  isUndoing,
  isAccepting,
  isReviewing,
  onUndo,
  onAcceptAll,
  onReview,
}: ChatStatusBarProps) {
  if (status !== 'streaming' && !canUndo) return null;

  return (
    <div className={cn(
      "flex items-center justify-between px-3.5 py-2",
      "bg-background",
      "border border-b-0 border-border",
      "rounded-t-xl",
      "animate-in fade-in slide-in-from-bottom-2 duration-300",
      "min-h-[44px]"
    )}>
      {status === 'streaming' ? (
        <div className="flex items-center gap-2.5 px-0.5 animate-pulse">
          <div className="flex items-center justify-center size-5 rounded-full bg-primary/10">
            <Loader2 className="size-3 animate-spin text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Generating...</span>
        </div>
      ) : <div />}

      {canUndo && (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReview}
                disabled={isAccepting || isUndoing}
                className={cn(
                  "h-7 gap-1.5 px-2.5 text-xs font-medium rounded-lg transition-all",
                  isReviewing
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <FileDiff className="size-3.5" />
                {isReviewing ? 'Reviewing' : 'Review'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Review changes before accepting</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={isUndoing || isAccepting}
                  className="h-7 gap-1.5 px-2.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="size-3.5" />
                  {isUndoing ? 'Rejecting...' : 'Reject'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Discard all changes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onAcceptAll}
                  disabled={isAccepting || isUndoing}
                  className="h-7 gap-1.5 px-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Check className="size-3.5" />
                  {isAccepting ? 'Accepting...' : 'Accept'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Accept all changes</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
