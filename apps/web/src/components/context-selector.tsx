import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckIcon, WifiOffIcon, SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUserStreamContextOptional } from "./user-stream-provider";
import { getFileIcon } from "./file-icons";

interface ContextSelectorProps {
  text: string;
  cursorPosition: number;
  onFileSelect: (file: string) => void;
  onClose: () => void;
  cwd: string;
  selectedFiles?: string[];
  onToggleFile?: (file: string) => void;
}

export function ContextSelector({
  text,
  cursorPosition,
  onFileSelect,
  onClose,
  cwd,
  selectedFiles = [],
  onToggleFile,
}: ContextSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevQuery, setPrevQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const userStream = useUserStreamContextOptional();

  const { data: contextFiles, isLoading: isLoadingContext } = useQuery({
    queryKey: ["get_context", userStream?.cliConnected, cwd],
    queryFn: async () => {
      if (!userStream?.rpc) {
        throw new Error('RPC not available');
      }
      return await userStream.rpc.getContext(cwd);
    },
    enabled: (userStream?.cliConnected ?? false) && !!cwd,
    retry: false,
    staleTime: 30000,
  });

  const files = contextFiles?.files ?? [];

  const getQuery = () => {
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return '';
    return textBeforeCursor.slice(lastAtIndex + 1);
  };

  const query = getQuery();
  const filteredFiles = useMemo(() =>
    files.filter(file =>
      file.toLowerCase().includes(query.toLowerCase())
    ), [files, query]
  );

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (filteredFiles.length === 0 && !isLoadingContext) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInTextarea = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

      if (!isInTextarea && !containerRef.current?.contains(target)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (filteredFiles[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onFileSelect(filteredFiles[selectedIndex]);
        }
      } else if (e.key === 'Tab' && onToggleFile) {
        if (filteredFiles[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onToggleFile(filteredFiles[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredFiles, selectedIndex, onFileSelect, onClose, isLoadingContext, onToggleFile]);

  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  const isCliDisconnected = !userStream?.cliConnected;

  const panel = "w-72 rounded-xl border border-border/50 bg-popover backdrop-blur-md shadow-xl overflow-hidden";

  if (isCliDisconnected) {
    return (
      <div ref={containerRef} className={panel}>
        <div className="px-4 py-5 flex flex-col items-center gap-2">
          <WifiOffIcon className="size-4 text-muted-foreground/40" />
          <p className="text-[11px] text-muted-foreground/60 font-medium">CLI not connected</p>
        </div>
      </div>
    );
  }

  if (isLoadingContext) {
    return (
      <div ref={containerRef} className={panel}>
        <div className="px-3 py-3 flex items-center justify-center gap-2">
          <Loader2 className="size-3 animate-spin text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/60 font-medium">Loading files...</span>
        </div>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <div ref={containerRef} className={panel}>
        <div className="px-4 py-5 flex flex-col items-center gap-2">
          <SearchIcon className="size-4 text-muted-foreground/30" />
          <p className="text-[11px] text-muted-foreground/50 font-medium">
            {query ? (
              <>No matches for <span className="font-mono text-foreground/40">&quot;{query}&quot;</span></>
            ) : (
              'No files found'
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={panel}>
      <div className="max-h-72 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50">
        {filteredFiles.map((file, index) => {
          const isSelected = selectedIndex === index;
          const isInContext = selectedFiles.includes(file);
          const fileName = file.split('/').pop() || file;
          const directoryPath = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : '';

          return (
            <div
              key={file}
              ref={isSelected ? selectedItemRef : null}
              onClick={() => onFileSelect(file)}
              className={cn(
                "relative mx-1 rounded-lg cursor-pointer flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 text-xs",
                "transition-colors duration-100",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-full transition-all duration-150",
                isSelected ? "h-4 bg-foreground/60" : "h-0 bg-transparent"
              )} />

              <div className="shrink-0">
                {getFileIcon(file)}
              </div>

              <div className="truncate flex-1 min-w-0">
                {directoryPath && (
                  <div className="text-[10px] text-muted-foreground/60 truncate font-mono leading-tight">
                    {directoryPath}
                  </div>
                )}
                <span className="font-mono text-[11px] truncate block leading-snug">
                  {fileName}
                </span>
              </div>

              {isInContext && (
                <CheckIcon className="size-3 text-primary/70 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
        
      {selectedFiles.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20">
          <span className="text-[10px] text-muted-foreground/60 font-medium tabular-nums">
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );
}

export type { ContextSelectorProps };
