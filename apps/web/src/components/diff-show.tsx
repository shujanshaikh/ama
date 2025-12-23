import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

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
      diffViewerColor: 'rgba(250, 250, 250, 0.6)',
      addedBackground: 'rgba(74, 222, 128, 0.04)',
      addedColor: 'rgba(134, 239, 172, 0.8)',
      removedBackground: 'rgba(248, 113, 113, 0.04)',
      removedColor: 'rgba(252, 165, 165, 0.8)',
      wordAddedBackground: 'rgba(74, 222, 128, 0.15)',
      wordRemovedBackground: 'rgba(248, 113, 113, 0.15)',
      addedGutterBackground: 'rgba(74, 222, 128, 0.06)',
      removedGutterBackground: 'rgba(248, 113, 113, 0.06)',
      gutterBackground: 'transparent',
      gutterBackgroundDark: 'transparent',
      highlightBackground: 'rgba(255, 255, 255, 0.01)',
      highlightGutterBackground: 'rgba(255, 255, 255, 0.01)',
      codeFoldGutterBackground: 'transparent',
      codeFoldBackground: 'rgba(255, 255, 255, 0.01)',
      emptyLineBackground: 'transparent',
    },
  },
  line: {
    padding: '2px 12px',
    fontSize: '12px',
    fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", ui-monospace, monospace',
    letterSpacing: '-0.01em',
  },
  gutter: {
    padding: '2px 10px',
    minWidth: '40px',
    fontSize: '10px',
    fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
    color: 'rgba(161, 161, 170, 0.4)',
  },
  marker: {
    padding: '2px 8px',
    fontSize: '10px',
  },
  contentText: {
    fontSize: '12px',
    lineHeight: '1.6',
  },
  codeFold: {
    fontSize: '10px',
    fontStyle: 'normal',
    color: 'rgba(161, 161, 170, 0.3)',
  },
  diffContainer: {
    overflow: 'hidden',
  },
  diffRemoved: {
    borderLeft: '1px solid rgba(248, 113, 113, 0.3)',
  },
  diffAdded: {
    borderLeft: '1px solid rgba(74, 222, 128, 0.3)',
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="mt-2"
    >
      <Card className="overflow-hidden p-0 border shadow-sm">
        {showHeader && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/30 transition-colors border-b border-border/20 group"
          >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.12 }}
              className="text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </motion.div>

            {fileName ? (
              <span className="text-xs text-foreground/60">{fileName}</span>
            ) : (
              <span className="text-xs text-muted-foreground/60">Changes</span>
            )}

            <div className="flex items-center gap-1.5 ml-2">
              {added > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 tabular-nums">
                  +{added}
                </Badge>
              )}
              {removed > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 tabular-nums">
                  -{removed}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showActions && editStatus === 'applied' && (
              <div className="flex items-center gap-1.5">
                {isProcessing ? (
                  <span className="text-[10px] text-muted-foreground">Processing</span>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept?.();
                      }}
                      className="h-6 px-2 text-[10px]"
                      title="Accept changes"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject?.();
                      }}
                      className="h-6 px-2 text-[10px]"
                      title="Reject changes"
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            )}
            {editStatus === 'accepted' && (
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                Accepted
              </Badge>
            )}
            {editStatus === 'reverted' && (
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                Reverted
              </Badge>
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
      </Card>
    </motion.div>
  );
};

export default DiffShow;
