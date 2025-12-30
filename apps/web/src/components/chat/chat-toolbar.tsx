import { CodeIcon, GlobeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatToolbarProps {
  onShowCodeEditor: () => void;
  previewCollapsed: boolean;
  onTogglePreview: () => void;
}

export function ChatToolbar({
  onShowCodeEditor,
  previewCollapsed,
  onTogglePreview,
}: ChatToolbarProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      <div className="flex items-center rounded-lg bg-muted/50 p-0.5 shadow-sm border border-border/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowCodeEditor}
          className={cn(
            "h-7 rounded-md px-3 text-xs font-medium transition-all",
            "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <CodeIcon className="mr-1.5 size-3.5" />
          Editor
        </Button>
        {previewCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePreview}
            className={cn(
              "h-7 rounded-md px-3 text-xs font-medium transition-all",
              "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <GlobeIcon className="mr-1.5 size-3.5" />
            Preview
          </Button>
        )}
      </div>
    </div>
  );
}

