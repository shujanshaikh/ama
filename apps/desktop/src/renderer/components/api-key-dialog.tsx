import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyIcon, CheckIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { api } from "@/lib/trpc";

interface ApiKeyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hasKey: boolean;
    onKeyChanged?: () => void;
}

export function ApiKeyDialog({
    open,
    onOpenChange,
    hasKey,
    onKeyChanged,
}: ApiKeyDialogProps) {
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentHasKey, setCurrentHasKey] = useState(hasKey);

    const handleSave = async () => {
        const key = apiKeyInput.trim();
        if (!key) return;
        setIsSaving(true);
        try {
            await api.saveApiKey(key);
            setCurrentHasKey(true);
            setApiKeyInput("");
            onKeyChanged?.();
        } catch (e) {
            console.error("Failed to save API key:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.deleteApiKey();
            setCurrentHasKey(false);
            onKeyChanged?.();
        } catch (e) {
            console.error("Failed to delete API key:", e);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyIcon className="size-4" />
                        AI Gateway API Key
                    </DialogTitle>
                    <DialogDescription>
                        This key is used for all premium models (Claude, GPT, etc.). It is
                        encrypted and stored securely.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                    {currentHasKey && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                            <CheckIcon className="size-3.5" />
                            Key configured
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Input
                            type="password"
                            placeholder={currentHasKey ? "Enter new key to update..." : "Enter your AI Gateway API key..."}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            className="flex-1 text-sm"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave();
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!apiKeyInput.trim() || isSaving}
                            className="shrink-0"
                        >
                            {isSaving ? (
                                <Loader2Icon className="size-3 animate-spin" />
                            ) : currentHasKey ? (
                                "Update"
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </div>

                    {currentHasKey && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-destructive hover:text-destructive"
                        >
                            {isDeleting ? (
                                <Loader2Icon className="size-3 animate-spin mr-1.5" />
                            ) : (
                                <Trash2Icon className="size-3 mr-1.5" />
                            )}
                            Remove key
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
