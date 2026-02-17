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
}

export function ChatToolbar({
  onShowCodeEditor,
}: ChatToolbarProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowCodeEditor}
            className={cn(
              "h-8 rounded-md px-2.5 text-xs font-medium transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            Editor
            <div className="ml-1.5 flex items-center gap-0.5 opacity-50">
              <CommandIcon className="size-3" />
              <span className="text-[10px]">E</span>
            </div>
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

    </div>
  );
}

