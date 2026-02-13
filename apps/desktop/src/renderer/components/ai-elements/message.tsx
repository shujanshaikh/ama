import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
    from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
    <div
        className={cn(
            "group flex w-full flex-col",
            from === "user" ? "is-user items-end" : "is-assistant",
            className
        )}
        {...props}
    />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
    children,
    className,
    ...props
}: MessageContentProps) => (
    <div
        className={cn(
            "mt-3 mb-1 flex min-w-0 flex-col gap-2 overflow-hidden text-sm",
            "group-[.is-user]:w-full group-[.is-user]:max-w-full group-[.is-user]:rounded-2xl group-[.is-user]:bg-secondary/50 group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-foreground/90",
            "group-[.is-assistant]:w-full group-[.is-assistant]:max-w-full group-[.is-assistant]:text-foreground",
            className
        )}
        {...props}
    >
        {children}
    </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
    className,
    children,
    ...props
}: MessageActionsProps) => (
    <div className={cn("flex items-center gap-1", className)} {...props}>
        {children}
    </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
    tooltip?: string;
    label?: string;
};

export const MessageAction = ({
    tooltip,
    children,
    label,
    variant = "ghost",
    size = "icon-sm",
    ...props
}: MessageActionProps) => {
    const button = (
        <Button size={size} type="button" variant={variant} {...props}>
            {children}
            <span className="sr-only">{label || tooltip}</span>
        </Button>
    );

    if (tooltip) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return button;
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
    ({ className, ...props }: MessageResponseProps) => (
        <Streamdown
            className={cn(
                "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                className
            )}
            {...props}
        />
    ),
    (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
    className,
    children,
    ...props
}: MessageToolbarProps) => (
    <div
        className={cn(
            "mt-2 flex w-full items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            className
        )}
        {...props}
    >
        {children}
    </div>
);
