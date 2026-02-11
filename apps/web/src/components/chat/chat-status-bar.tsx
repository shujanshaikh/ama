import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="flex justify-end mb-1.5 px-1">
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5",
          "bg-secondary/50 backdrop-blur-md",
          "border border-border/40",
          "rounded-full",
          "shadow-xs"
        )}
      >
        {status === 'streaming' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-4 rounded-full bg-primary/10">
              <Loader2 className="size-2.5 animate-spin text-primary/70" />
            </div>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground animate-pulse">
              Generating...
            </span>
          </div>
        )}

        <AnimatePresence>
          {canUndo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1"
            >
              {status === 'streaming' && (
                <div className="h-3.5 w-px bg-border/50 mx-0.5" />
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReview}
                    disabled={isAccepting || isUndoing}
                    className={cn(
                      "h-6 gap-1.5 px-2 text-[11px] font-semibold tracking-wide rounded-full transition-all duration-200",
                      isReviewing
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    )}
                  >
                    <FileDiff className="size-3" />
                    {isReviewing ? 'Reviewing' : 'Review'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Review changes before accepting</TooltipContent>
              </Tooltip>

              <div className="h-3.5 w-px bg-border/50 mx-0.5" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onUndo}
                    disabled={isUndoing || isAccepting}
                    className="h-6 gap-1.5 px-2 text-[11px] font-semibold tracking-wide rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-200"
                  >
                    <X className="size-3" />
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
                    className={cn(
                      "h-6 gap-1.5 px-2.5 text-[11px] font-semibold tracking-wide rounded-full transition-all duration-200",
                      "bg-foreground text-background",
                      "hover:opacity-90 hover:scale-[1.02]",
                      "active:scale-[0.98]",
                      "disabled:opacity-40"
                    )}
                  >
                    <Check className="size-3" />
                    {isAccepting ? 'Accepting...' : 'Accept'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Accept all changes</TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
