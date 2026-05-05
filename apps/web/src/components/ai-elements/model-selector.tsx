import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type ModelSelectorProps = ComponentProps<typeof Dialog>;

export const ModelSelector = (props: ModelSelectorProps) => (
  <Dialog {...props} />
);

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent
    className={cn(
      "gap-0 overflow-hidden border border-border/15 p-0 shadow-2xl sm:max-w-[28rem]",
      "bg-popover/85 backdrop-blur-2xl",
      "dark:border-white/8 dark:bg-popover/60",
      className
    )}
    showCloseButton={false}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="**:[&_[cmdk-group]]:px-2 **:data-[slot=command-input-wrapper]:h-auto **:data-[slot=command-input-wrapper]:border-border/25 **:data-[slot=command-input-wrapper]:px-4 **:data-[slot=command-input-wrapper]:py-1">
      {children}
    </Command>
  </DialogContent>
);

export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>;

export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => (
  <CommandDialog
    className={cn(
      "border border-border/15 bg-popover/85 backdrop-blur-2xl shadow-2xl dark:border-white/8 dark:bg-popover/60",
      props.className
    )}
    {...props}
  />
);

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>;

export const ModelSelectorInput = ({
  className,
  ...props
}: ModelSelectorInputProps) => (
  <CommandInput
    className={cn(
      "h-auto border-b-0 py-4 text-[15px] placeholder:text-muted-foreground/35",
      className
    )}
    {...props}
  />
);

export type ModelSelectorListProps = ComponentProps<typeof CommandList>;

export const ModelSelectorList = ({
  className,
  ...props
}: ModelSelectorListProps) => (
  <CommandList
    className={cn("max-h-[460px] scroll-py-2", className)}
    {...props}
  />
);

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty
    className="flex flex-col items-center justify-center gap-3 py-14 text-center text-sm text-muted-foreground/50"
    {...props}
  />
);

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export const ModelSelectorGroup = ({
  className,
  ...props
}: ModelSelectorGroupProps) => (
  <CommandGroup
    className={cn(
      "px-2 py-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2.5 [&_[cmdk-group-heading]]:pt-3.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground/35 [&_[cmdk-group-heading]]:uppercase",
      className
    )}
    {...props}
  />
);

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem> & {
  isActive?: boolean;
};

export const ModelSelectorItem = ({
  className,
  isActive,
  children,
  ...props
}: ModelSelectorItemProps) => (
  <CommandItem
    className={cn(
      "group relative flex cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 text-[13px] outline-hidden select-none transition-all duration-200 ease-out",
      "data-[selected=true]:bg-foreground/[0.04] data-[selected=true]:text-foreground",
      "hover:bg-foreground/[0.03]",
      "dark:data-[selected=true]:bg-white/[0.06] dark:data-[selected=true]:text-foreground",
      "dark:hover:bg-white/[0.04]",
      isActive && "bg-foreground/[0.03] dark:bg-white/[0.05]",
      className
    )}
    {...props}
  >
    {children}
    {isActive && (
      <span className="ml-auto flex h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40 ring-2 ring-foreground/10 dark:bg-white/40 dark:ring-white/10" />
    )}
  </CommandItem>
);

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export const ModelSelectorShortcut = ({
  className,
  ...props
}: ModelSelectorShortcutProps) => (
  <CommandShortcut
    className={cn(
      "ml-auto text-[10px] font-medium tracking-wider text-muted-foreground/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-data-[selected=true]:opacity-100",
      className
    )}
    {...props}
  />
);

export type ModelSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

export const ModelSelectorSeparator = ({
  className,
  ...props
}: ModelSelectorSeparatorProps) => (
  <CommandSeparator
    className={cn("bg-border/25 mx-3 my-2 h-px", className)}
    {...props}
  />
);

export type ModelSelectorLogoProps = Omit<
  ComponentProps<"img">,
  "src" | "alt"
> & {
  provider:
    | "moonshotai-cn"
    | "lucidquery"
    | "moonshotai"
    | "zai-coding-plan"
    | "alibaba"
    | "xai"
    | "vultr"
    | "nvidia"
    | "upstage"
    | "groq"
    | "github-copilot"
    | "mistral"
    | "vercel"
    | "nebius"
    | "deepseek"
    | "alibaba-cn"
    | "google-vertex-anthropic"
    | "venice"
    | "chutes"
    | "cortecs"
    | "github-models"
    | "togetherai"
    | "azure"
    | "baseten"
    | "huggingface"
    | "opencode"
    | "fastrouter"
    | "google"
    | "google-vertex"
    | "cloudflare-workers-ai"
    | "inception"
    | "wandb"
    | "openai"
    | "zhipuai-coding-plan"
    | "perplexity"
    | "openrouter"
    | "zenmux"
    | "v0"
    | "iflowcn"
    | "synthetic"
    | "deepinfra"
    | "zhipuai"
    | "submodel"
    | "zai"
    | "inference"
    | "requesty"
    | "morph"
    | "lmstudio"
    | "anthropic"
    | "aihubmix"
    | "fireworks-ai"
    | "modelscope"
    | "llama"
    | "scaleway"
    | "amazon-bedrock"
    | "cerebras"
    | (string & {});
};

export const ModelSelectorLogo = ({
  provider,
  className,
  ...props
}: ModelSelectorLogoProps) => (
  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.06]">
    <img
      {...props}
      alt={`${provider} logo`}
      className={cn("size-[18px] dark:invert", className)}
      height={18}
      src={`https://models.dev/logos/${provider}.svg`}
      width={18}
    />
  </div>
);

export type ModelSelectorLogoGroupProps = ComponentProps<"div">;

export const ModelSelectorLogoGroup = ({
  className,
  ...props
}: ModelSelectorLogoGroupProps) => (
  <div
    className={cn(
      "-space-x-2 flex shrink-0 items-center",
      className
    )}
    {...props}
  />
);

export type ModelSelectorNameProps = ComponentProps<"span">;

export const ModelSelectorName = ({
  className,
  ...props
}: ModelSelectorNameProps) => (
  <span
    className={cn(
      "flex-1 truncate text-left text-[13px] font-medium tracking-tight",
      className
    )}
    {...props}
  />
);

export type ModelSelectorMetaProps = ComponentProps<"span">;

export const ModelSelectorMeta = ({
  className,
  ...props
}: ModelSelectorMetaProps) => (
  <span
    className={cn(
      "truncate text-[11px] font-normal text-muted-foreground/50",
      className
    )}
    {...props}
  />
);

export type ModelSelectorBadgeProps = ComponentProps<"span">;

export const ModelSelectorBadge = ({
  className,
  children,
  ...props
}: ModelSelectorBadgeProps) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-foreground/50",
      className
    )}
    {...props}
  >
    {children}
  </span>
);
