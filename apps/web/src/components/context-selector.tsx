import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckIcon } from "lucide-react";
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

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const isCliDisconnected = !userStream?.cliConnected;

  if (isCliDisconnected) {
    return (
      <div
        ref={containerRef}
        className="w-64 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-sm shadow-lg overflow-hidden"
      >
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">CLI not connected</p>
        </div>
      </div>
    );
  }

  if (isLoadingContext) {
    return (
      <div
        ref={containerRef}
        className="w-64 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-sm shadow-lg overflow-hidden"
      >
        <div className="px-3 py-3 flex items-center justify-center gap-2">
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-64 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-sm shadow-lg overflow-hidden"
      >
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            {query ? `No matches for "${query}"` : 'No files'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-64 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-sm shadow-lg overflow-hidden"
    >
      <div className="max-h-48 overflow-y-auto py-1">
        {filteredFiles.map((file, index) => {
          const isSelected = selectedIndex === index;
          const isInContext = selectedFiles.includes(file);
          const fileName = file.split('/').pop() || file;

          return (
            <div
              key={file}
              ref={isSelected ? selectedItemRef : null}
              onClick={() => onFileSelect(file)}
              className={cn(
                "px-2.5 py-1.5 mx-1 rounded-lg cursor-pointer flex items-center gap-2 text-xs transition-colors duration-150",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-muted/70"
              )}
            >
              {getFileIcon(file)}
              <span className="truncate flex-1 font-mono text-[11px]">{fileName}</span>
              {isInContext && (
                <CheckIcon className="size-3 text-primary/70" />
              )}
            </div>
          );
        })}
      </div>

      {selectedFiles.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          <span className="text-[10px] text-muted-foreground font-medium">
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );
}

export type { ContextSelectorProps };
