import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/install")({
    component: InstallPage,
});

const INSTALL_COMMAND = "curl -fsSL https://amadev.vercel.app/install.sh | bash";

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
            ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
            )}
        </Button>
    );
}

function InstallPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <main className="flex-1 flex flex-col items-center px-4 py-16 md:py-24">
                <div className="container max-w-2xl mx-auto w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">
                            Install{" "}
                            <span className="text-primary">ama</span>{" "}
                            CLI
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            One command to get started
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="group relative">
                            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3.5">
                                <code className="flex-1 font-mono text-sm text-foreground">
                                    {INSTALL_COMMAND}
                                </code>
                                <CopyButton text={INSTALL_COMMAND} />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-6">Or install via npm</p>
                            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3.5 mb-8">
                                <code className="flex-1 font-mono text-sm text-foreground">
                                    npm install -g amai
                                </code>
                                <CopyButton text="npm install -g amai" />
                            </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t">
                            <div>
                                <p className="text-sm text-muted-foreground mb-4 text-center">
                                    After installing, start the CLI:
                                </p>
                                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3.5">
                                    <code className="flex-1 font-mono text-sm text-foreground">
                                        amai
                                    </code>
                                    <CopyButton text="amai" />
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-4 text-center">
                                    Or view help:
                                </p>
                                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3.5">
                                    <code className="flex-1 font-mono text-sm text-foreground">
                                        amai --help
                                    </code>
                                    <CopyButton text="amai --help" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            <footer className="w-full py-6 text-center text-xs text-muted-foreground">
                <div className="container mx-auto px-6">
                    © {new Date().getFullYear()} Ama, Inc.
                </div>
            </footer>
        </div>
    );
}
