import { memo, useMemo, lazy, Suspense, useState, useEffect } from 'react';
import {
  type FileDiffMetadata,
  parseDiffFromFile
} from '@pierre/diffs';
import type { FileContents, FileDiffProps } from '@pierre/diffs/react';
import { Loader2 } from 'lucide-react';


const LazyFileDiff = lazy(() =>
  import('@pierre/diffs/react').then((module) => ({ default: module.FileDiff }))
);

interface PierreDiffProps {
  oldFile: FileContents;
  newFile: FileContents;
  splitView?: boolean;
}

const getDiffOptions = (splitView: boolean): FileDiffProps<undefined>['options'] => ({
  theme: { dark: "material-theme-darker", light: "material-theme-lighter" },
  diffStyle: splitView ? "split" : "unified",
  diffIndicators: "bars",
  expandUnchanged: true,
  lineDiffType: "word",
});


export const PierreDiff = memo(function PierreDiff({
  oldFile,
  newFile,
  splitView = false,
}: PierreDiffProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const oldContent = oldFile.contents || '';
  const newContent = newFile.contents || '';

  const fileDiff = useMemo<FileDiffMetadata>(() => {
    return parseDiffFromFile(oldFile, newFile);
  }, [oldFile, newFile]);

  if (oldContent === newContent) {
    return null;
  }

  if (!isMounted) {
    return (
      <div className="mt-2">
        <div className="overflow-hidden border border-border/30 rounded-lg">
          <div className="p-4 text-[13px] text-muted-foreground/70 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading diff...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="overflow-hidden border border-border/30 rounded-lg">
        <div className="overflow-hidden">
          <div className="max-h-[380px] overflow-auto diff-scrollbar">
            <Suspense
              fallback={
                <div className="p-4 text-[13px] text-muted-foreground/70 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading diff...
                </div>
              }
            >
              <LazyFileDiff
                // style={{
                //   '--diffs-font-family': 'var(--font-mono)',
                //   '--diffs-font-size': '13px',
                //   '--diffs-line-height': '1.6',
                //   '--diffs-tab-size': '2',
                //   '--diffs-header-font-family': 'var(--font-sans)',
                //   '--diffs-font-features': 'normal',
                //   '--diffs-min-number-column-width': '3ch',
                //   // Deletion: using destructive red from theme
                //   '--diffs-deletion-color-override': 'oklch(0.67 0.145 17)',
                //   // Addition: using a softer green/teal that complements the purple theme
                //   '--diffs-addition-color-override': 'oklch(0.72 0.15 145)',
                //   // Modified: using chart-3 purple/magenta accent
                //   '--diffs-modified-color-override': 'oklch(0.61 0.22 293)',
                //   // Selection: using primary purple tones
                //   '--diffs-selection-color-override': 'var(--primary)',
                //   '--diffs-bg-selection-override': 'oklch(0.51 0.23 277 / 0.15)',
                //   '--diffs-bg-selection-number-override': 'oklch(0.51 0.23 277 / 0.35)',
                //   '--diffs-bg-selection-background-override': 'oklch(0.51 0.23 277 / 0.1)',
                //   '--diffs-bg-selection-number-background-override': 'oklch(0.51 0.23 277 / 0.25)',
                //   '--diffs-gap-inline': '6px',
                //   '--diffs-gap-block': '4px',
                // } as React.CSSProperties}
                fileDiff={fileDiff}
                options={getDiffOptions(splitView)}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PierreDiff;
