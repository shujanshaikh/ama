import { XIcon, RotateCcwIcon, AlertCircleIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';

interface ChatErrorAlertProps {
  error: Error | string | null;
  onDismiss: () => void;
  onRetry: () => void;
}

export function ChatErrorAlert({ error, onDismiss, onRetry }: ChatErrorAlertProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex justify-center mb-2"
        >
          <div className="w-[90%]">
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-destructive/8 border border-destructive/15 backdrop-blur-sm">
              <div className="shrink-0 size-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircleIcon className="size-3.5 text-destructive" />
              </div>
              <span className="flex-1 text-[13px] text-foreground/80 leading-snug">
                {error instanceof Error ? error.message : String(error)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-all duration-200 gap-1.5"
                >
                  <RotateCcwIcon className="size-3" />
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onDismiss}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
                  aria-label="Dismiss error"
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
