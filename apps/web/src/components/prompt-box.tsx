import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputTextarea,
    type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type DashboardPromptBoxProps = {
    onSubmit?: (message: string) => void | Promise<void>;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    containerClassName?: string;
};

export function PromptBox({
    onSubmit,
    placeholder = "ask ama what you want to build...",
    disabled = false,
    className,
    containerClassName,
}: DashboardPromptBoxProps) {
    const [input, setInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (message: PromptInputMessage) => {
        const text = message.text?.trim();
        if (!text || isSubmitting || disabled) return;

        setIsSubmitting(true);
        try {
            await onSubmit?.(text);
            setInput("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = input.trim().length > 0 && !isSubmitting && !disabled;

    return (
        <div className={cn("w-full max-w-2xl mx-auto", containerClassName)}>
            <PromptInput
                onSubmit={handleSubmit}
                inputGroupClassName="bg-transparent border-0 shadow-none rounded-3xl"
                className={cn(
                    "rounded-3xl",
                    disabled && "opacity-60 cursor-not-allowed",
                    className
                )}
            >
                <PromptInputBody>
                    <PromptInputTextarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled || isSubmitting}
                        className={cn(
                            "min-h-[40px] max-h-[140px] resize-none bg-transparent",
                            "text-base placeholder:text-muted-foreground/50",
                            "border-0 focus:ring-0 focus:outline-none",
                            "px-4 py-2"
                        )}
                    />
                </PromptInputBody>
                <PromptInputFooter className="px-3 pb-2 pt-0 border-t-0">
                    <div className="flex-1" />
                    <PromptInputSubmit
                        disabled={!canSubmit}
                        className={cn(
                            "h-8 w-8 rounded-lg transition-all duration-200",
                            canSubmit
                                ? "bg-foreground text-background hover:opacity-90 hover:scale-105"
                                : "bg-muted/60 text-muted-foreground"
                        )}
                    />
                </PromptInputFooter>
            </PromptInput>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/40">
                <span>Press</span>
                <kbd className="rounded-md border border-border/30 bg-muted/10 px-1.5 py-0.5 font-mono text-[10px]">
                    ↵
                </kbd>
                <span>to send</span>
            </div>
        </div>
    );
}
