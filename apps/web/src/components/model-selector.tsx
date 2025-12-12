import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from "./ui/select";
import { chatModel } from "@ama/backend/convex/agent/models";
import { cn } from "@/lib/utils";
import { useStoreValue } from "@simplestack/store/react";
import { selectedModel } from "@/lib/store";

const PROVIDER_LABELS: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    xai: "xAI",
    zai: "Zai",
    deepseek: "DeepSeek",
    perplexity: "Perplexity",
    moonshotai: "Moonshot AI",
};

function getProvider(id: string) {
    const provider = id.split("/")[0] || "other";
    return provider in PROVIDER_LABELS ? provider : "other";
}

type ModelOption = (typeof chatModel)[number];

export default function ChatModelSelector({ model }: { model: string }) {
    const selectedModelValue = useStoreValue(selectedModel);
    const effectiveModel = selectedModelValue || model || chatModel[0]?.id || "";
    const selectedModelData = chatModel.find((m) => m.id === effectiveModel);
    // Group models by provider while preserving their original order
    const groups = chatModel.reduce<Record<string, ModelOption[]>>((acc, m) => {
        const provider = getProvider(m.id);
        if (!acc[provider]) acc[provider] = [] as ModelOption[];
        acc[provider].push(m);
        return acc;
    }, {} as Record<string, ModelOption[]>);

    const providersOrder = chatModel
        .map((m) => getProvider(m.id))
        .filter((p, idx, arr) => arr.indexOf(p) === idx);

    return (
        <Select value={effectiveModel} onValueChange={(value) => selectedModel.set(value)}>
            <SelectTrigger
                size="sm"
                className={cn(
                    "h-7 md:h-8 px-2 md:px-3 text-[10px] sm:text-xs font-medium rounded-xl",
                    "border-0 !border-0 bg-transparent !bg-transparent",
                    "dark:bg-transparent dark:hover:bg-transparent",
                    "text-sidebar-foreground/90",
                    "shadow-none !shadow-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/40",
                    "focus-visible:border-0 focus-visible:!border-0"
                )}
            >
                <SelectValue>
                    <span className="truncate max-w-[6rem] sm:max-w-[8rem] md:max-w-[12rem] text-sidebar-foreground/90 text-[10px] sm:text-xs">
                        {selectedModelData ? selectedModelData.name : "Select model"}
                    </span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent
                className={cn(
                    "w-[320px] max-w-[calc(100vw-2rem)] md:w-[480px] max-h-[80vh] overflow-y-auto rounded-xl border border-sidebar-border/50",
                    "bg-gradient-to-br from-sidebar/95 via-sidebar/90 to-sidebar/95 shadow-2xl backdrop-blur-xl p-2",
                    "scrollbar-thin scrollbar-thumb-sidebar-border/60 scrollbar-track-transparent"
                )}
            >
                <div className="space-y-3">
                    {providersOrder.map((provider) => (
                        <div
                            key={provider}
                            className="rounded-xl border border-sidebar-border/40 bg-gradient-to-br from-sidebar/80 via-sidebar/75 to-sidebar/80 shadow-inner shadow-black/5"
                        >
                            <SelectGroup>
                                <SelectLabel className="px-3 py-2 text-[11px] tracking-wide uppercase text-sidebar-foreground/60">
                                    {PROVIDER_LABELS[provider] || provider}
                                </SelectLabel>

                                <div className="grid grid-cols-2 gap-2 p-2 pt-0">
                                    {groups[provider]?.map((modelOption) => (
                                        <SelectItem
                                            key={modelOption.id}
                                            value={modelOption.id}
                                            className={cn(
                                                "relative w-auto h-auto min-h-[84px] items-start justify-start rounded-lg text-left overflow-hidden",
                                                "border border-sidebar-border/40 bg-sidebar/60 text-sidebar-foreground/90 shadow-xs",
                                                "pl-3 pr-9 py-2.5 transition-all duration-300 hover:border-sidebar-border/20 hover:bg-sidebar/70 hover:shadow-sm",
                                                "before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-sidebar-primary/10 before:via-sidebar-accent/10 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300",
                                                "hover:before:opacity-100 data-[highlighted]:before:opacity-100",
                                                "data-[state=checked]:border-sidebar-primary/60 data-[state=checked]:shadow-md data-[state=checked]:before:opacity-100 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-sidebar/70 data-[state=checked]:to-sidebar-accent/20"
                                            )}
                                        >
                                            <div className="relative z-10 flex flex-col gap-1.5">
                                                <span className="text-sm font-medium leading-none text-sidebar-foreground">
                                                    {modelOption.name}
                                                </span>
                                                {modelOption.description ? (
                                                    <span className="text-xs text-sidebar-foreground/70 leading-relaxed line-clamp-3 text-pretty">
                                                        {modelOption.description}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </div>
                            </SelectGroup>
                        </div>
                    ))}
                </div>
            </SelectContent>
        </Select>
    );
}
