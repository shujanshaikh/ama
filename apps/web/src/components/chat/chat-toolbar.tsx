import { CommandIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

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
              "h-9 rounded-lg px-2 text-xs font-medium transition-all duration-200",
              "bg-background/80 backdrop-blur-md border border-border/60",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-background hover:border-border hover:shadow-md",
              "active:scale-95"
            )}
          >
            Editor
            <KbdGroup className="ml-1 gap-0.5">
              <Kbd className="bg-transparent"><CommandIcon className="size-3" /></Kbd>
              <Kbd className="bg-transparent">E</Kbd>
            </KbdGroup>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2 text-xs">
          Open code editor
          <KbdGroup className="gap-0.5">
            <Kbd className="bg-transparent"><CommandIcon className="size-3" /></Kbd>
            <Kbd className="bg-transparent">E</Kbd>
          </KbdGroup>
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
                "h-9 rounded-lg px-2 text-xs font-medium transition-all duration-200",
                "bg-background/80 backdrop-blur-md border border-border/60",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-background hover:border-border hover:shadow-md",
                "active:scale-95"
              )}
            >
              Preview
              <KbdGroup className="ml-1 gap-0.5">
                <Kbd className="bg-transparent"><CommandIcon className="size-3" /></Kbd>
                <Kbd className="bg-transparent">A</Kbd>
              </KbdGroup>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-2 text-xs">
            Show live preview
            <KbdGroup className="gap-0.5">
              <Kbd className="bg-transparent"><CommandIcon className="size-3" /></Kbd>
              <Kbd className="bg-transparent">A</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

