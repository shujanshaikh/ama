import type { ChatMessage } from '@ama/server/lib/tool-types';
import { motion } from 'motion/react';
import DiffShow from './diff-show';
import { useEditHistoryStore } from '@/lib/useEditHistoryStore';
import { useMutation } from '@tanstack/react-query';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, Terminal } from 'lucide-react';

// Minimal streaming indicator
const StreamingDots = () => (
  <span className="inline-flex items-center gap-0.5 ml-1.5">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-0.5 h-0.5 rounded-full bg-current opacity-40"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          delay: i * 0.25,
          ease: "easeInOut"
        }}
      />
    ))}
  </span>
);

const EditableToolItem = ({ 
  toolCallId, filePath, oldString, newString, fileName, projectCwd 
}: {
  toolCallId: string;
  filePath: string;
  oldString: string;
  newString: string;
  fileName: string;
  projectCwd?: string;
}) => {
  const { addEdit, acceptEdit, revertEdit } = useEditHistoryStore();
  const edit = useEditHistoryStore(state => state.edits.find(e => e.id === toolCallId));
  if (!edit && oldString && newString) {
    addEdit({ id: toolCallId, filePath, oldContent: oldString, newContent: newString });
  }
  const handleAccept = () => acceptEdit(toolCallId);
  
  const { mutate: handleReject, isPending: isProcessing } = useMutation({
    mutationFn: async () => {
      const response = await fetch('http://localhost:3456/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, oldString, newString, projectCwd }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revert');
      }
      return response.json();
    },
    onSuccess: () => {
      revertEdit(toolCallId);
    },
    onError: (error) => {
      console.error('Failed to revert:', error);
    }
  });
  return (
    <ToolItem>
      <DiffShow
        oldString={oldString}
        newString={newString}
        fileName={fileName}
        showActions={true}
        editStatus={edit?.status}
        onAccept={handleAccept}
        onReject={handleReject}
        isProcessing={isProcessing}
      />
    </ToolItem>
  );
};

// Minimal base wrapper
const ToolItem = ({ children, isStreaming = false }: { children: React.ReactNode; isStreaming?: boolean }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.15 }}
    className={`py-1 ${isStreaming ? 'text-muted-foreground/60' : 'text-foreground/70'}`}
  >
    {children}
  </motion.div>
);

// Extract filename from path
const getFileName = (path?: string) => {
  if (!path) return 'file';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

export const ToolRenderer = ({ part, projectCwd }: { part: ChatMessage['parts'][number]; projectCwd?: string }) => {
  // Edit File
  if (part.type === "tool-editFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.target_file);
    // const targetFile = part.input?.target_file;
    // const content = part.input?.content;

    // if (state === "input-streaming") {
    //   return (
    //     <ToolItem key={toolCallId} isStreaming>
    //       <span className="text-sm">
    //         Editing <span className="text-zinc-200 font-medium">{targetFile}</span>
    //         <span className="text-zinc-200 font-medium">{content}</span>
    //         <StreamingDots />
    //       </span>
    //     </ToolItem>
    //   );
    // }

    if (state === "output-available") {
      const output = part.output as {
        success?: boolean;
        linesAdded?: number;
        linesRemoved?: number;
        isNewFile?: boolean;
        old_string?: string;
        new_string?: string;
      } | undefined;
      const oldString = output?.old_string || '';
      const newString = output?.new_string || '';
      const actualFilePath = part.input?.target_file || fileName;

      return (
        <ToolItem key={toolCallId}>
          <EditableToolItem toolCallId={toolCallId} filePath={actualFilePath} oldString={oldString} newString={newString} fileName={fileName} projectCwd={projectCwd} />
        </ToolItem>
      );
    }
  }

  // Delete File
  if (part.type === "tool-deleteFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Deleting <span className="text-foreground/50">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Deleted <span className="text-foreground/50">{fileName}</span>
          </span>
        </ToolItem>
      );
    }
  }

  // Read File
  if (part.type === "tool-readFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.relative_file_path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Reading <span className="text-foreground/50">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { totalLines?: number } | undefined;
      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Read <span className="text-foreground/50">{fileName}</span>
            {output?.totalLines && (
              <span className="text-muted-foreground/50 ml-1.5">({output.totalLines} lines)</span>
            )}
          </span>
        </ToolItem>
      );
    }
  }

  if (part.type === "tool-listDirectory") {
    const { toolCallId, state } = part;
    const dirName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Listing <span className="text-foreground/50">{dirName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { files?: Array<{ name: string; type: string }> } | undefined;
      const fileCount = output?.files?.filter(f => f.type === 'file').length || 0;
      const dirCount = output?.files?.filter(f => f.type === 'directory').length || 0;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Listed <span className="text-foreground/50">{dirName}</span>
            {(fileCount > 0 || dirCount > 0) && (
              <span className="text-muted-foreground/50 ml-1.5">
                ({fileCount} file{fileCount !== 1 ? 's' : ''}{dirCount > 0 ? `, ${dirCount} dir${dirCount !== 1 ? 's' : ''}` : ''})
              </span>
            )}
          </span>
        </ToolItem>
      );
    }
  }

  // Glob Tool
  if (part.type === "tool-glob") {
    const { toolCallId, state } = part;

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Searching files
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { files?: string[] | Array<{ path?: string; name?: string }> } | undefined;
      const fileCount = Array.isArray(output?.files) ? output.files.length : 0;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Found <span className="text-foreground/50">{fileCount}</span> file{fileCount !== 1 ? 's' : ''}
          </span>
        </ToolItem>
      );
    }
  }

  // Grep Tool
  if (part.type === "tool-grep") {
    const { toolCallId, state } = part;

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Searching
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { matchCount?: number; result?: { totalMatches?: number } } | undefined;
      const matchCount = output?.matchCount || output?.result?.totalMatches || 0;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Found <span className="text-foreground/50">{matchCount}</span> match{matchCount !== 1 ? 'es' : ''}
          </span>
        </ToolItem>
      );
    }
  }

  // String Replace
  if (part.type === "tool-stringReplace") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.file_path);
    const inputOldString = part.input?.old_string || '';
    const inputNewString = part.input?.new_string || '';

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <DiffShow oldString={inputOldString} newString={inputNewString} fileName={fileName} />
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as {
        linesAdded?: number;
        linesRemoved?: number;
        old_string?: string;
        new_string?: string;
      } | undefined;
      const oldString = output?.old_string || inputOldString;
      const newString = output?.new_string || inputNewString;
      const actualFilePath = part.input?.file_path || fileName;

      return (
        <ToolItem key={toolCallId}>
          <EditableToolItem toolCallId={toolCallId} filePath={actualFilePath} oldString={oldString} newString={newString} fileName={fileName} projectCwd={projectCwd} />
        </ToolItem>
      );
    }
  }

  // Run Terminal Command
  if (part.type === "tool-runTerminalCommand") {
    const { toolCallId, state } = part;
    const command = part.input?.command;

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground/60" />
            <span className="text-sm">
              Running <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{command}</span>
            </span>
            <StreamingDots />
          </div>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { success?: boolean; message?: string; error?: string; stdout?: string; stderr?: string; exitCode?: number } | undefined;
      const isSuccess = output?.success !== false && (!output?.exitCode || output.exitCode === 0);
      
      return (
        <ToolItem key={toolCallId}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Terminal className="size-4 text-muted-foreground/70" />
              <span className="text-sm">
                Ran <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{command}</span>
              </span>
              <Badge 
                variant={isSuccess ? "default" : "destructive"} 
                className="gap-1 text-xs"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    Success
                  </>
                ) : (
                  <>
                    <XCircle className="size-3" />
                    Failed
                  </>
                )}
              </Badge>
              {output?.exitCode !== undefined && output.exitCode !== 0 && (
                <span className="text-xs text-muted-foreground/60">
                  Exit code: {output.exitCode}
                </span>
              )}
            </div>
            {(output?.stdout || output?.stderr || output?.message) && (
              <div className="ml-6 space-y-1">
                {output?.message && (
                  <div className="text-xs text-muted-foreground/70">
                    {output.message}
                  </div>
                )}
                {output?.stdout && (
                  <div className="text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border/50">
                    <div className="text-muted-foreground/60 text-[10px] mb-0.5">STDOUT:</div>
                    <div className="text-foreground/80 whitespace-pre-wrap break-words">{output.stdout}</div>
                  </div>
                )}
                {output?.stderr && (
                  <div className="text-xs font-mono bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                    <div className="text-destructive/70 text-[10px] mb-0.5">STDERR:</div>
                    <div className="text-destructive/90 whitespace-pre-wrap break-words">{output.stderr}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ToolItem>
      );
    }
  }

  return null;
};