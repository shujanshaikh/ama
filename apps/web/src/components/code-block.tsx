import { useState, useMemo, useRef, useEffect } from 'react';
import { codeToHtml } from 'shiki';
import { getFileIcon } from './file-icons';
import { StreamingDots } from './tool-render';

export const getLanguageFromPath = (filePath?: string): string => {
    if (!filePath) return 'sh';
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'tsx',
      'js': 'javascript',
      'jsx': 'jsx',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'zsh',
      'sql': 'sql',
      'vue': 'vue',
      'svelte': 'svelte',
      'xml': 'xml',
      'graphql': 'graphql',
      'gql': 'graphql',
    };
    return languageMap[ext || ''] || 'sh';
  };
  
  export const StreamingCodeBlock = ({
    code,
    filePath,
    fileName
  }: {
    code: string;
    filePath?: string;
    fileName: string;
  }) => {
    const [highlightedHtml, setHighlightedHtml] = useState<string>('');
    const [darkHighlightedHtml, setDarkHighlightedHtml] = useState<string>('');
    const language = useMemo(() => getLanguageFromPath(filePath), [filePath]);
    const previousCodeRef = useRef<string>('');
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    useEffect(() => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
  
      if (code === previousCodeRef.current) return;
      previousCodeRef.current = code;
  
      highlightTimeoutRef.current = setTimeout(async () => {
        if (!code) {
          setHighlightedHtml('');
          setDarkHighlightedHtml('');
          return;
        }
  
        try {
          const [lightHtml, darkHtml] = await Promise.all([
            codeToHtml(code, {
              lang: language,
              theme: "material-theme-darker",
            }),
            codeToHtml(code, {
              lang: language,
              theme: "material-theme-darker",
            }),
          ]);
          setHighlightedHtml(lightHtml);
          setDarkHighlightedHtml(darkHtml);
        } catch {
          setHighlightedHtml(`<pre><code>${code}</code></pre>`);
          setDarkHighlightedHtml(`<pre><code>${code}</code></pre>`);
        }
      }, 50);
  
      return () => {
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }, [code, language]);
  
    if (!code) {
      return null;
    }
  
    return (
      <div className="mt-2 rounded-md border border-border/50 bg-background overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/30">
          {getFileIcon(filePath)}
          <span className="text-xs font-mono text-muted-foreground">{fileName}</span>
          <StreamingDots />
        </div>
        <div className="max-h-[300px] overflow-auto">
          <div
            className="dark:hidden [&>pre]:m-0 [&>pre]:bg-transparent! [&>pre]:p-3 [&>pre]:text-xs [&_code]:font-mono [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: highlightedHtml || `<pre class="p-3 text-xs"><code class="font-mono text-muted-foreground">${code}</code></pre>` }}
          />
          <div
            className="hidden dark:block [&>pre]:m-0 [&>pre]:bg-transparent! [&>pre]:p-3 [&>pre]:text-xs [&_code]:font-mono [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: darkHighlightedHtml || `<pre class="p-3 text-xs"><code class="font-mono text-muted-foreground">${code}</code></pre>` }}
          />
        </div>
      </div>
    );
  };