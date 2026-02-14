import {
    Select,
    SelectContent,
    SelectItem,
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
    return (
        <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger size="sm" className="h-7 text-xs gap-1 border-none bg-transparent shadow-none hover:bg-accent/50 transition-colors">
                <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent align="start">
                {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px] uppercase font-medium tracking-wider">
                                {getProviderFromId(m.id)}
                            </span>
                            <span>{m.name}</span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
