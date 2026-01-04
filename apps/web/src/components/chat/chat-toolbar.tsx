import { TerminalIcon, AppWindowIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowCodeEditor}
            className={cn(
              "h-9 rounded-lg px-4 text-xs font-medium transition-all duration-200",
              "bg-background/80 backdrop-blur-md border border-border/60",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-background hover:border-border hover:shadow-md",
              "active:scale-95"
            )}
          >
            <TerminalIcon className="mr-1.5 size-3.5" />
            Editor
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Open code editor
        </TooltipContent>
      </Tooltip>

      {previewCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePreview}
              className={cn(
                "h-9 rounded-lg px-4 text-xs font-medium transition-all duration-200",
                "bg-background/80 backdrop-blur-md border border-border/60",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-background hover:border-border hover:shadow-md",
                "active:scale-95"
              )}
            >
              <AppWindowIcon className="mr-1.5 size-3.5" />
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Show live preview
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

