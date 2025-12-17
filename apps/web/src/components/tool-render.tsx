import type { ChatMessage } from '@ama/server/lib/tool-types';
import { motion } from 'motion/react';

// Subtle streaming indicator - just animated dots
const StreamingDots = () => (
  <span className="inline-flex items-center gap-0.5 ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1 h-1 rounded-full bg-zinc-400"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: i * 0.2,
          ease: "easeInOut"
        }}
      />
    ))}
  </span>
);

// Diff badge component for showing +/- lines
const DiffBadge = ({ added, removed }: { added?: number; removed?: number }) => {
  if (!added && !removed) return null;

  return (
    <span className="inline-flex gap-1.5 ml-2">
      {added && added > 0 && (
        <span className="text-xs font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          +{added}
        </span>
      )}
      {removed && removed > 0 && (
        <span className="text-xs font-mono text-rose-400/90 bg-rose-500/10 px-1.5 py-0.5 rounded">
          -{removed}
        </span>
      )}
    </span>
  );
};

// Base wrapper with enter animation
const ToolItem = ({ children, isStreaming = false }: { children: React.ReactNode; isStreaming?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className={`px-3 py-1.5 ${isStreaming ? 'text-zinc-400' : 'text-zinc-300'}`}
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

export const ToolRenderer = ({ part }: { part: ChatMessage['parts'][number] }) => {
  // Edit Files
  if (part.type === "tool-editFiles") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.target_file);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Editing <span className="text-zinc-200 font-medium">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { success?: boolean; linesAdded?: number; linesRemoved?: number; isNewFile?: boolean } | undefined;
      const action = output?.isNewFile ? 'Created' : 'Modified';

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            {action} <span className="font-medium">{fileName}</span>
            <DiffBadge added={output?.linesAdded} removed={output?.linesRemoved} />
          </span>
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
            Deleting <span className="text-zinc-200 font-medium">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Deleted <span className="font-medium">{fileName}</span>
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
            Reading <span className="text-zinc-200 font-medium">{fileName}</span>
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
            Read <span className="font-medium">{fileName}</span>
            {output?.totalLines && (
              <span className="text-zinc-500 ml-1.5">({output.totalLines} lines)</span>
            )}
          </span>
        </ToolItem>
      );
    }
  }

  // List Directory
  if (part.type === "tool-list") {
    const { toolCallId, state } = part;
    const dirName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Listing <span className="text-zinc-200 font-medium">{dirName}</span>
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
            Listed <span className="font-medium">{dirName}</span>
            {(fileCount > 0 || dirCount > 0) && (
              <span className="text-zinc-500 ml-1.5">
                ({fileCount} file{fileCount !== 1 ? 's' : ''}{dirCount > 0 ? `, ${dirCount} dir${dirCount !== 1 ? 's' : ''}` : ''})
              </span>
            )}
          </span>
        </ToolItem>
      );
    }
  }

  // Glob Tool
  if (part.type === "tool-globTool") {
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
            Found <span className="font-medium">{fileCount}</span> file{fileCount !== 1 ? 's' : ''}
          </span>
        </ToolItem>
      );
    }
  }

  // Grep Tool
  if (part.type === "tool-grepTool") {
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
            Found <span className="font-medium">{matchCount}</span> match{matchCount !== 1 ? 'es' : ''}
          </span>
        </ToolItem>
      );
    }
  }

  // String Replace
  if (part.type === "tool-stringReplace") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.file_path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Replacing in <span className="text-zinc-200 font-medium">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { linesAdded?: number; linesRemoved?: number } | undefined;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Replaced in <span className="font-medium">{fileName}</span>
            <DiffBadge added={output?.linesAdded} removed={output?.linesRemoved} />
          </span>
        </ToolItem>
      );
    }
  }

  return null;
};