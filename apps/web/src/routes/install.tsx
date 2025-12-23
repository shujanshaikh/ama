import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Terminal, Command, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { AmaLogo } from "../components/ama-logo";
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
            className="p-2.5 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
            ) : (
                <Copy className="w-4 h-4 text-zinc-400 hover:text-zinc-300" />
            )}
        </Button>
    );
}



function InstallPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-background selection:bg-primary/10">
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
                <div className="absolute top-[20%] left-[-5%] w-[400px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
            </div>

            <header className="sticky top-0 z-50 w-full border-b border-border/5 backdrop-blur-sm">
                <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-6">
                    <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <AmaLogo size={36} />
                    </a>
                    <a
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Back to home
                    </a>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center relative px-4 z-10 py-12 md:py-20">
                <div className="container max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="text-center mb-12 md:mb-16"
                    >
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-4">
                            Install{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-accent to-primary/80">
                                ama
                            </span>{" "}
                            CLI
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Get up and running in seconds. One command to install, then you're ready to build.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-12 md:mb-16"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

                            <div className="relative bg-zinc-950/90 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-5 shadow-2xl shadow-primary/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <span className="text-xs text-zinc-500 ml-2 font-mono">terminal</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 overflow-x-auto">
                                        <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <code className="text-sm sm:text-base font-mono text-zinc-100 whitespace-nowrap">
                                            {INSTALL_COMMAND}
                                        </code>
                                    </div>
                                    <CopyButton text={INSTALL_COMMAND} />
                                </div>
                            </div>
                        </div>
                    </motion.div>


                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                                Alternative Methods
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Command className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm font-medium text-zinc-300">
                                        Using npm
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 bg-zinc-950/60 rounded-lg px-3 py-2.5">
                                    <code className="text-sm font-mono text-zinc-300">
                                        npm install -g amai
                                    </code>
                                    <CopyButton text="npm install -g amai" />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Terminal className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm font-medium text-zinc-300">
                                        After installing
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 bg-zinc-950/60 rounded-lg px-3 py-2.5">
                                    <code className="text-sm font-mono text-zinc-300">amai</code>
                                    <CopyButton text="amai" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            <footer className="w-full py-8 text-center text-xs text-muted-foreground/30 relative z-10">
                <div className="container mx-auto px-6">
                    © {new Date().getFullYear()} Ama, Inc.
                </div>
            </footer>
        </div>
    );
}
