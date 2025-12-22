import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useMemo } from 'react';
import { ChevronDown, Minus, Plus, FileCode2 } from 'lucide-react';
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
      diffViewerColor: 'rgb(161 161 170)',
      addedBackground: 'rgba(34, 197, 94, 0.08)',
      addedColor: 'rgb(134 239 172)',
      removedBackground: 'rgba(244, 63, 94, 0.08)',
      removedColor: 'rgb(253 164 175)',
      wordAddedBackground: 'rgba(34, 197, 94, 0.25)',
      wordRemovedBackground: 'rgba(244, 63, 94, 0.25)',
      addedGutterBackground: 'rgba(34, 197, 94, 0.15)',
      removedGutterBackground: 'rgba(244, 63, 94, 0.15)',
      gutterBackground: 'rgba(39, 39, 42, 0.5)',
      gutterBackgroundDark: 'rgba(39, 39, 42, 0.7)',
      highlightBackground: 'rgba(63, 63, 70, 0.4)',
      highlightGutterBackground: 'rgba(63, 63, 70, 0.5)',
      codeFoldGutterBackground: 'rgba(39, 39, 42, 0.3)',
      codeFoldBackground: 'rgba(39, 39, 42, 0.2)',
      emptyLineBackground: 'rgba(39, 39, 42, 0.1)',
    },
  },
  line: {
    padding: '2px 10px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  gutter: {
    padding: '2px 8px',
    minWidth: '35px',
    fontSize: '11px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  marker: {
    padding: '2px 6px',
    fontSize: '11px',
  },
  contentText: {
    fontSize: '12px',
    lineHeight: '1.6',
  },
  codeFold: {
    fontSize: '11px',
    fontStyle: 'italic',
  },
  diffContainer: {
   // borderRadius: '2px',
    overflow: 'hidden',
  },
  diffRemoved: {
    borderLeft: '2px solid rgb(244 63 94)',
  },
  diffAdded: {
    borderLeft: '2px solid rgb(34 197 94)',
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mt-3 rounded-sm overflow-hidden border border-zinc-700/40 bg-gradient-to-b from-zinc-900/50 to-zinc-900/30 backdrop-blur-sm shadow-lg shadow-black/10"
    >
      {showHeader && (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-800/20 hover:bg-zinc-800/40 transition-all duration-200 border-b border-zinc-700/30 rounded-t-sm"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </motion.div>

            {fileName ? (
              <div className="flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">{fileName}</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-zinc-400">Changes</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {added > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400/90 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                <Plus className="w-2.5 h-2.5" />
                {added}
              </span>
            )}
            {removed > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-rose-400/90 bg-rose-500/15 px-2 py-0.5 rounded-md">
                <Minus className="w-2.5 h-2.5" />
                {removed}
              </span>
            )}
            {showActions && editStatus === 'applied' && (
              <div className="flex items-center gap-1.5 ml-2">
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept?.();
                      }}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                      title="Accept changes"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject?.();
                      }}
                      className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400"
                      title="Reject changes"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}
            {editStatus === 'accepted' && (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 
                   px-2 py-0.5 rounded-md ml-2">Accepted</span>
            )}
            {editStatus === 'reverted' && (
              <span className="text-[10px] font-medium text-rose-400 bg-rose-500/15 
                   px-2 py-0.5 rounded-md ml-2">Reverted</span>
            )}
          </div>
        </motion.button>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="max-h-[400px] overflow-auto custom-scrollbar p-1">
              <ReactDiffViewer
                oldValue={oldString || ''}
                newValue={newString || ''}
                splitView={false}
                showDiffOnly={true}
                useDarkTheme={true}
                styles={customStyles}
                compareMethod={DiffMethod.WORDS}
                hideLineNumbers={false}
                extraLinesSurroundingDiff={1}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(39, 39, 42, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(113, 113, 122, 0.4);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(113, 113, 122, 0.6);
        }
      `}</style>
    </motion.div>
  );
};

export default DiffShow;
