import { Undo2Icon, CheckIcon, EyeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import { Shimmer } from "@/components/ai-elements/shimmer"

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
      "flex items-center justify-between px-4 py-2",
      "bg-muted/40 backdrop-blur-sm",
      "border border-b-0 border-border/40",
      "rounded-t-2xl"

    )}>
      {status === 'streaming' ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shimmer as="span">Generating...</Shimmer>
        </div>
      ) : null}
      {canUndo && (
        <ButtonGroup orientation="horizontal" className="ml-auto">
          <Button
            variant="secondary"
            size="default"
            onClick={onAcceptAll}
            disabled={isAccepting || isUndoing}
            className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-100 disabled:hover:scale-100 disabled:hover:shadow-none group rounded-xl"
          >
            <CheckIcon className="size-3.5 mr-1.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
            {isAccepting ? 'Accepting...' : 'Accept'}
          </Button>
          <Button
            variant="secondary"
            size="default"
            onClick={onReview}
            disabled={isAccepting || isUndoing}
            className={cn(
              "h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-100 disabled:hover:scale-100 disabled:hover:shadow-none group rounded-xl",
              isReviewing && "bg-primary/20 text-primary"
            )}
          >
            <EyeIcon className="size-3.5 mr-1.5 transition-transform duration-200 group-hover:scale-110" />
            Review
          </Button>
          <Button
            variant="secondary"
            size="default"
            onClick={onUndo}
            disabled={isUndoing || isAccepting}
            className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-100 disabled:hover:scale-100 disabled:hover:shadow-none group rounded-xl"
          >
            <Undo2Icon className="size-3.5 mr-1.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
            {isUndoing ? 'Reverting...' : 'Undo'}
          </Button>
        </ButtonGroup>
      )}
    </div>
  );
}

