import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
    type ComponentProps,
    createContext,
    type HTMLAttributes,
    useContext,
    useEffect,
    useState,
} from "react";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
    code: string;
    language?: string;
};

type CodeBlockContextType = {
    code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
    code: "",
});

export const CodeBlock = ({
    code,
    language,
    className,
    children,
    ...props
}: CodeBlockProps) => {
    return (
        <CodeBlockContext.Provider value={{ code }}>
            <div
                className={cn(
                    "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
                    className
                )}
                {...props}
            >
                <div className="relative">
                    {language && (
                        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-1.5">
                            <span className="text-xs text-muted-foreground font-mono">{language}</span>
                        </div>
                    )}
                    <pre className="overflow-auto p-4 text-sm">
                        <code className="font-mono text-sm whitespace-pre">{code}</code>
                    </pre>
                    {children && (
                        <div className="absolute top-2 right-2 flex items-center gap-2">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </CodeBlockContext.Provider>
    );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};

export const CodeBlockCopyButton = ({
    onCopy,
    onError,
    timeout = 2000,
    children,
    className,
    ...props
}: CodeBlockCopyButtonProps) => {
    const [isCopied, setIsCopied] = useState(false);
    const { code } = useContext(CodeBlockContext);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            onCopy?.();
            setTimeout(() => setIsCopied(false), timeout);
        } catch (error) {
            onError?.(error as Error);
        }
    };

    const Icon = isCopied ? CheckIcon : CopyIcon;

    return (
        <Button
            className={cn("shrink-0", className)}
            onClick={copyToClipboard}
            size="icon"
            variant="ghost"
            {...props}
        >
            {children ?? <Icon size={14} />}
        </Button>
    );
};
