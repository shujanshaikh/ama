import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Terminal, Package, Play, Zap, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/install")({
    component: InstallPage,
});

const INSTALL_COMMAND = "curl -fsSL https://amadev.vercel.app/install.sh | bash";
const NPM_COMMAND = "npm install -g amai";
const BUN_COMMAND = "bun add -g amai";

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="h-9 px-3 gap-2 text-xs font-medium transition-all duration-300 hover:bg-primary/10"
            aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                </>
            ) : (
                <>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground hidden sm:inline">Copy</span>
                </>
            )}
        </Button>
    );
}

function CodeBlock({ command, delay = 0 }: { command: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="group relative"
        >
            <div className="absolute inset-0  from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2 sm:gap-3 rounded-xl border border-border/60 bg-muted/30 backdrop-blur-sm px-3 sm:px-4 py-3 sm:py-3.5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center gap-1.5 sm:gap-2 text-primary/60 shrink-0">
                    <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-xs font-medium">$</span>
                </div>
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                    <code className="font-mono text-xs sm:text-sm text-foreground tracking-tight whitespace-nowrap">
                        {command}
                    </code>
                </div>
                <div className="shrink-0">
                    <CopyButton text={command} />
                </div>
            </div>
        </motion.div>
    );
}

function StepCard({
    step,
    title,
    description,
    children,
    icon: Icon,
    delay = 0
}: {
    step: number;
    title: string;
    description: string;
    children: React.ReactNode;
    icon: React.ElementType;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
        >
            <div className="absolute left-5 sm:left-6 top-14 sm:top-16 bottom-0 w-px from-border to-transparent hidden md:block" />

            <div className="flex gap-3 sm:gap-4 md:gap-6">
                <div className="flex flex-col items-center shrink-0">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-bold text-primary">{step}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 pb-8 sm:pb-10 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed max-w-lg">
                        {description}
                    </p>
                    {children}
                </div>
            </div>
        </motion.div>
    );
}

function InstallPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, currentColor 1px, transparent 1px),
                        linear-gradient(to bottom, currentColor 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <main className="relative z-10 flex-1 px-4 sm:px-6 md:px-12 lg:px-24 py-8 sm:py-12 md:py-20">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-10 sm:mb-16"
                    >
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-6 sm:w-8 h-px bg-primary" />
                            <span className="text-[10px] sm:text-xs font-medium tracking-[0.15em] uppercase text-primary">
                                Quick Start Guide
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-4">
                            Get started with{" "}
                            <span className="text-primary">ama</span>
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl">
                            Follow these simple steps to install the CLI and start using ama in your projects.
                            It only takes a minute to set up.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                        className="mb-6 sm:mb-8 p-3 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
                    >
                        <div className="flex items-start gap-2 sm:gap-3">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-xs sm:text-sm font-medium text-foreground mb-1">Windows Users</h4>
                                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                    ama CLI requires a Unix-like environment. Please use{" "}
                                    <a
                                        href="https://learn.microsoft.com/en-us/windows/wsl/install"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        WSL (Windows Subsystem for Linux)
                                    </a>{" "}
                                    to run the CLI on Windows.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="space-y-2">
                        <StepCard
                            step={1}
                            title="Install the CLI"
                            description="Run one of the following commands in your terminal to install the ama CLI globally on your machine. You only need to do this once."
                            icon={Package}
                            delay={0.1}
                        >
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Recommended
                                        </span>
                                        <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                                            Quick Install
                                        </span>
                                    </div>
                                    <CodeBlock command={INSTALL_COMMAND} delay={0.15} />
                                </div>

                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium whitespace-nowrap">or via package manager</span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                npm
                                            </span>
                                        </div>
                                        <CodeBlock command={NPM_COMMAND} delay={0.2} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                bun
                                            </span>

                                        </div>
                                        <CodeBlock command={BUN_COMMAND} delay={0.25} />
                                    </div>
                                </div>
                            </div>
                        </StepCard>

                        <StepCard
                            step={2}
                            title="Start ama"
                            description="Launch the ama CLI from any directory. It works globally, so you can run it from anywhere on your system."
                            icon={Play}
                            delay={0.3}
                        >
                            <CodeBlock command="amai" delay={0.35} />
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/30 rounded-xl border border-border/60"
                            >

                                <ul className="text-[11px] sm:text-xs text-muted-foreground space-y-2 sm:space-y-2.5">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5 font-bold">1.</span>
                                        <span>The CLI will ask you to choose a mode: <code className="px-1 sm:px-1.5 py-0.5 bg-muted rounded text-foreground font-mono text-[10px] sm:text-[11px]">background</code> or <code className="px-1 sm:px-1.5 py-0.5 bg-muted rounded text-foreground font-mono text-[10px] sm:text-[11px]">normal</code> mode</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5 font-bold">2.</span>
                                        <span>A browser window will open automatically</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5 font-bold">3.</span>
                                        <span>Sign in with your account to connect</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5 font-bold">4.</span>
                                        <span>Start chatting with ama to modify your code!</span>
                                    </li>
                                </ul>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.45 }}
                                className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-primary/5 rounded-lg border border-primary/20"
                            >
                                <div className="flex items-start gap-2">
                                    <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 text-primary shrink-0" />
                                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Tip:</span> Use background mode if you want the CLI to run silently while you work in the browser.
                                    </p>
                                </div>
                            </motion.div>
                        </StepCard>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-border/50"
                    >
                        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Need help?</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-4 sm:p-5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/30 transition-all duration-300">
                                <h3 className="text-xs sm:text-sm font-medium mb-2">View all commands</h3>
                                <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                                    See all available CLI options and flags
                                </p>
                                <code className="text-[11px] sm:text-xs font-mono bg-muted px-1.5 sm:px-2 py-1 rounded">
                                    amai --help
                                </code>
                            </div>
                            <div className="p-4 sm:p-5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/30 transition-all duration-300">
                                <h3 className="text-xs sm:text-sm font-medium mb-2">Check version</h3>
                                <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                                    Make sure you have the latest version installed
                                </p>
                                <code className="text-[11px] sm:text-xs font-mono bg-muted px-1.5 sm:px-2 py-1 rounded">
                                    amai --version
                                </code>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="mt-8 sm:mt-12 text-center"
                    >
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            Already installed? Head to the dashboard to start coding.
                        </p>
                        <Button asChild size="default" className="rounded-lg px-6 sm:px-8 font-medium text-sm sm:text-base sm:h-11">
                            <Link to="/dashboard">
                                Go to Dashboard
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>

            <footer className="relative z-10 w-full py-6 sm:py-8 border-t border-border/50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 lg:px-24 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="text-[11px] sm:text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Ama, Inc.
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-[11px] sm:text-xs">
                        <a
                            href="https://x.com/amadotdev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Twitter
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
