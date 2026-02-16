import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { models } from "../../lib/models";

interface ModelSelectorProps {
    model: string;
    onModelChange: (model: string) => void;
}

function getProviderFromId(id: string): string {
    if (id.includes("/")) return id.split("/")[0];
    if (id.includes("-")) return id.split("-")[0];
    return "opencode";
}

export function ModelSelector({ model, onModelChange }: ModelSelectorProps) {
    const groupedModels = {
        free: models.filter((m) => m.type === "free"),
        gateway: models.filter((m) => m.type === "gateway"),
        codex: models.filter((m) => m.type === "codex"),
    };

    const groups = [
        { key: "free", label: "Free Models", items: groupedModels.free },
        { key: "gateway", label: "Gateway (BYOK)", items: groupedModels.gateway },
        { key: "codex", label: "ChatGPT Subscription", items: groupedModels.codex },
    ] as const;

    return (
        <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger size="sm" className="h-7 text-xs gap-1 border-none bg-transparent shadow-none hover:bg-accent/50 transition-colors">
                <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent align="start">
                {groups.map((group, groupIndex) => (
                    <div key={group.key}>
                        {groupIndex > 0 ? <SelectSeparator /> : null}
                        <SelectGroup>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.items.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    <span className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-[10px] uppercase font-medium tracking-wider">
                                            {m.type === "codex" ? "chatgpt" : getProviderFromId(m.id)}
                                        </span>
                                        <span>{m.name}</span>
                                        {m.type === "codex" ? (
                                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">
                                                ChatGPT
                                            </span>
                                        ) : null}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </div>
                ))}
            </SelectContent>
        </Select>
    );
}
