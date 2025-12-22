import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useMemo } from 'react';
import { ChevronRight, Minus, Plus, File } from 'lucide-react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface DiffShowProps {
  oldString: string;
  newString: string;
  fileName?: string;
  showHeader?: boolean;
  showActions?: boolean;
  editStatus?: 'applied' | 'accepted' | 'reverted';
  onAccept?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

const countDiffLines = (oldStr: string, newStr: string) => {
  const oldLines = oldStr?.split('\n') || [];
  const newLines = newStr?.split('\n') || [];

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const added = newLines.filter(line => !oldSet.has(line)).length;
  const removed = oldLines.filter(line => !newSet.has(line)).length;

  return { added, removed };
};

const customStyles = {
  variables: {
    dark: {
      diffViewerBackground: 'transparent',
      diffViewerColor: 'rgba(250, 250, 250, 0.7)',
      addedBackground: 'rgba(74, 222, 128, 0.06)',
      addedColor: 'rgba(134, 239, 172, 0.95)',
      removedBackground: 'rgba(248, 113, 113, 0.06)',
      removedColor: 'rgba(252, 165, 165, 0.95)',
      wordAddedBackground: 'rgba(74, 222, 128, 0.2)',
      wordRemovedBackground: 'rgba(248, 113, 113, 0.2)',
      addedGutterBackground: 'rgba(74, 222, 128, 0.1)',
      removedGutterBackground: 'rgba(248, 113, 113, 0.1)',
      gutterBackground: 'transparent',
      gutterBackgroundDark: 'transparent',
      highlightBackground: 'rgba(255, 255, 255, 0.02)',
      highlightGutterBackground: 'rgba(255, 255, 255, 0.02)',
      codeFoldGutterBackground: 'transparent',
      codeFoldBackground: 'rgba(255, 255, 255, 0.02)',
      emptyLineBackground: 'transparent',
    },
  },
  line: {
    padding: '1px 12px',
    fontSize: '12.5px',
    fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", ui-monospace, monospace',
    letterSpacing: '-0.01em',
  },
  gutter: {
    padding: '1px 10px',
    minWidth: '40px',
    fontSize: '11px',
    fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
    color: 'rgba(161, 161, 170, 0.5)',
  },
  marker: {
    padding: '1px 8px',
    fontSize: '11px',
  },
  contentText: {
    fontSize: '12.5px',
    lineHeight: '1.7',
  },
  codeFold: {
    fontSize: '11px',
    fontStyle: 'normal',
    color: 'rgba(161, 161, 170, 0.4)',
  },
  diffContainer: {
    overflow: 'hidden',
  },
  diffRemoved: {
    borderLeft: '2px solid rgba(248, 113, 113, 0.6)',
  },
  diffAdded: {
    borderLeft: '2px solid rgba(74, 222, 128, 0.6)',
  },
};

export const DiffShow = ({
  oldString,
  newString,
  fileName,
  showHeader = true,
  showActions,
  editStatus,
  onAccept,
  onReject,
  isProcessing,
}: DiffShowProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const { added, removed } = useMemo(
    () => countDiffLines(oldString, newString),
    [oldString, newString]
  );

  if ((!oldString && !newString) || oldString === newString) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-3 rounded-lg overflow-hidden border border-zinc-800/60 bg-zinc-950/40"
    >
      {showHeader && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors duration-150 border-b border-zinc-800/40 group"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.12 }}
              className="text-zinc-500 group-hover:text-zinc-400 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>

            {fileName ? (
              <div className="flex items-center gap-2">
                <File className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[13px] font-medium text-zinc-300 tracking-tight">{fileName}</span>
              </div>
            ) : (
              <span className="text-[13px] font-medium text-zinc-400 tracking-tight">Changes</span>
            )}

            <div className="flex items-center gap-1.5 ml-2">
              {added > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-400/80 tabular-nums">
                  <Plus className="w-3 h-3" strokeWidth={2.5} />
                  {added}
                </span>
              )}
              {removed > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-400/80 tabular-nums">
                  <Minus className="w-3 h-3" strokeWidth={2.5} />
                  {removed}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {showActions && editStatus === 'applied' && (
              <div className="flex items-center gap-1">
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept?.();
                      }}
                      className="h-6 w-6 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
                      title="Accept changes"
                    >
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject?.();
                      }}
                      className="h-6 w-6 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                      title="Reject changes"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </Button>
                  </>
                )}
              </div>
            )}
            {editStatus === 'accepted' && (
              <span className="text-[10px] font-medium text-green-400/90 bg-green-500/10 px-2 py-0.5 rounded-full tracking-wide uppercase">
                Accepted
              </span>
            )}
            {editStatus === 'reverted' && (
              <span className="text-[10px] font-medium text-red-400/90 bg-red-500/10 px-2 py-0.5 rounded-full tracking-wide uppercase">
                Reverted
              </span>
            )}
          </div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="max-h-[350px] overflow-auto diff-scrollbar">
              <ReactDiffViewer
                oldValue={oldString || ''}
                newValue={newString || ''}
                splitView={false}
                showDiffOnly={true}
                useDarkTheme={true}
                styles={customStyles}
                compareMethod={DiffMethod.WORDS}
                hideLineNumbers={false}
                extraLinesSurroundingDiff={2}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .diff-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(82, 82, 91, 0.4) transparent;
        }
        .diff-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .diff-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .diff-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(82, 82, 91, 0.4);
          border-radius: 10px;
        }
        .diff-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(82, 82, 91, 0.6);
        }
        .diff-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </motion.div>
  );
};

export default DiffShow;
