import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Terminal, Package, Play, Zap, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/install")({
    component: InstallPage,
});

const INSTALL_COMMAND = "curl -fsSL https://ama.shujan.xyz/install.sh | bash";
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
            className="rounded-none border-l-4 border-foreground h-full px-4 gap-2 font-mono uppercase bg-transparent hover:bg-foreground hover:text-background transition-none"
            aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Copied</span>
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy</span>
                </>
            )}
        </Button>
    );
}

function CodeBlock({ command, delay = 0, label }: { command: string; delay?: number; label?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay }}
            className="relative group mt-6"
        >
            {label && (
                <div className="absolute -top-3 -left-2 bg-foreground text-background font-mono text-[10px] px-2 py-1 z-20 uppercase font-bold">
                    {label}
                </div>
            )}
            <div className="flex border-rough border-2 border-foreground shadow-[4px_4px_0px_0px_var(--color-primary)] bg-background">
                <div className="flex flex-1 overflow-x-auto p-3 py-4 scrollbar-hide items-center text-foreground font-bold">
                    <Terminal className="w-4 h-4 mr-3 text-primary shrink-0" />
                    <code className="font-mono text-xs sm:text-sm whitespace-nowrap">
                        {command}
                    </code>
                </div>
                <div className="shrink-0 flex items-stretch">
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
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start py-10 border-b-2 border-foreground last:border-b-0"
        >
            <div className="lg:col-span-4 relative">
                <div className="font-display text-[14vw] md:text-[6vw] leading-none text-transparent mb-3 mix-blend-difference pointer-events-none absolute -top-8 -left-6" style={{ WebkitTextStroke: "1px var(--color-foreground)", opacity: 0.1 }}>
                    0{step}
                </div>
                <div className="relative z-10 flex items-center gap-3 mb-3">
                    <Icon className="w-6 h-6 text-primary" />
                    <h3 className="font-display text-3xl uppercase text-foreground bg-primary/20 mix-blend-luminosity px-2">{title}</h3>
                </div>
                <p className="font-mono text-muted-foreground text-xs md:text-sm border-l-2 border-primary pl-4 relative z-10 uppercase tracking-tight">
                    {description}
                </p>
            </div>
            <div className="lg:col-span-8 min-w-0 relative z-10 pt-4 lg:pt-0">
                {children}
            </div>
        </motion.div>
    );
}

function InstallPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans">
            <div className="grain-overlay" />

            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-px h-[200vh] bg-border/40 mix-blend-difference pointer-events-none" />
                <div className="absolute top-0 right-1/4 w-px h-[200vh] bg-border/40 mix-blend-difference pointer-events-none" />
            </div>

            <main className="relative z-10 flex-1 px-6 md:px-12 pt-24 pb-16">
                <div className="max-w-[1500px] mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-12 relative"
                    >
                        <div className="inline-block border-rough border-2 border-foreground bg-primary text-primary-foreground font-mono px-3 py-1 text-[10px] uppercase font-bold mb-6 transform -rotate-2">
                            SYS.INIT // Quick Start
                        </div>
                        <h1 className="font-display text-[10vw] md:text-[6vw] leading-[0.85] tracking-tighter uppercase text-foreground">
                            Install <span className="text-transparent bg-clip-text" style={{ WebkitTextStroke: "2px var(--color-primary)", backgroundImage: "repeating-linear-gradient(45deg, var(--color-primary) 0, var(--color-primary) 2px, transparent 2px, transparent 8px)" }}>AMA</span>
                        </h1>
                        <p className="font-mono text-sm md:text-base text-muted-foreground max-w-2xl mt-6 border-l-2 border-foreground pl-4 uppercase tracking-tight">
                            Execute these raw overrides to embed the agent inside your system. Pure chaos requires absolute permission.
                        </p>
                        
                        <div className="mt-6 inline-flex items-start gap-3 p-3 border-rough border-2 border-foreground bg-background max-w-xl shadow-[4px_4px_0px_var(--color-primary)]">
                            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5 stroke-[3]" />
                            <div>
                                <h4 className="font-mono text-xs font-bold uppercase mb-1">Windows Validation</h4>
                                <p className="font-mono text-[10px] text-muted-foreground uppercase">
                                    Windows systems require WSL. Inject via linux subsystem.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="space-y-2">
                        <StepCard
                            step={1}
                            title="Deploy CLI"
                            description="Run one of the following commands in your terminal to fuse the ama CLI globally onto your machine."
                            icon={Package}
                            delay={0.2}
                        >
                            <div className="space-y-4">
                                <div>
                                    <CodeBlock command={INSTALL_COMMAND} delay={0.3} label="Recommended Pipeline" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <CodeBlock command={NPM_COMMAND} delay={0.4} label="NPM Inject" />
                                    <CodeBlock command={BUN_COMMAND} delay={0.5} label="BUN Inject" />
                                </div>
                            </div>
                        </StepCard>

                        <StepCard
                            step={2}
                            title="Boot Sequence"
                            description="Launch the ama CLI from any directory. Global binary unlocked."
                            icon={Play}
                            delay={0.4}
                        >
                            <CodeBlock command="amai" delay={0.5} label="Ignition Command" />
                            
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-6 border-rough border-2 border-foreground bg-background p-5 shadow-[4px_4px_0px_0px_var(--color-primary)]"
                            >
                                <ul className="font-mono text-xs md:text-sm text-foreground space-y-3 uppercase tracking-tighter">
                                    <li className="flex items-center gap-3">
                                        <span className="text-primary font-bold bg-muted px-2 border border-foreground">01</span>
                                        <span>CLI prompts node state: <code className="bg-foreground text-background font-bold px-2 py-0.5 ml-1 inline-block">bg</code> or <code className="bg-foreground text-background font-bold px-2 py-0.5 inline-block">fg</code></span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-primary font-bold bg-muted px-2 border border-foreground">02</span>
                                        <span>Browser interface forcefully spins up</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-primary font-bold bg-muted px-2 border border-foreground">03</span>
                                        <span>Authenticate network connection</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="text-primary font-bold bg-foreground text-background px-2 border border-foreground">04</span>
                                        <span className="text-primary font-bold">Agent locked. Awaiting destructive code.</span>
                                    </li>
                                </ul>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="mt-6 flex items-start gap-4 p-4 border-2 border-foreground bg-primary/20 transform rotate-1 mix-blend-luminosity"
                            >
                                <Zap className="w-6 h-6 text-foreground shrink-0 fill-current" />
                                <p className="font-mono text-xs text-foreground uppercase font-bold leading-tight">
                                    Use background mode to demonize the process while you orchestrate directly from the browser window.
                                </p>
                            </motion.div>
                        </StepCard>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="mt-16 mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 border-t-4 border-foreground pt-10 relative"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 mix-blend-difference rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="p-6 border-rough border-2 border-foreground bg-background hover:bg-foreground hover:text-background transition-colors group cursor-pointer shadow-[4px_4px_0px_var(--color-primary)]">
                            <h3 className="font-display text-2xl uppercase mb-3">Command Ref</h3>
                            <code className="font-mono text-xs bg-foreground text-background px-3 py-1.5 group-hover:bg-primary group-hover:text-primary-foreground font-bold">amai --help</code>
                            <p className="font-mono text-[10px] mt-4 uppercase opacity-70">Access structural parameters</p>
                        </div>
                        <div className="p-6 border-rough border-2 border-foreground bg-background hover:bg-primary hover:text-primary-foreground transition-colors group shadow-[4px_4px_0px_var(--color-primary)] relative z-10 flex flex-col justify-between">
                            <div>
                                <h3 className="font-display text-2xl uppercase mb-3">Dashboard</h3>
                                <p className="font-mono text-[10px] mb-4 uppercase opacity-70">Already injected? Start operation.</p>
                            </div>
                            <Button size="lg" className="rounded-none bg-foreground text-background hover:bg-background hover:text-foreground font-display text-xl uppercase border-2 border-transparent hover:border-foreground transition-colors h-14 shadow-[4px_4px_0px_var(--color-primary)] group-hover:shadow-[4px_4px_0px_var(--color-background)] w-full" asChild>
                                <Link to="/dashboard">Engage Core</Link>
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </main>

            <footer className="relative z-10 w-full py-12 border-t-8 border-foreground bg-primary text-primary-foreground mt-24">
                <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 uppercase font-mono text-sm font-bold">
                    <div className="flex items-center gap-4 border-b-2 border-foreground pb-2 md:border-0 md:pb-0">
                        <Terminal className="w-6 h-6 border-2 border-foreground" />
                        AMA.DEV // {new Date().getFullYear()}
                    </div>
                    <div className="flex gap-8">
                        <a href="https://x.com/amadotdev" target="_blank" rel="noopener noreferrer" className="hover:text-background transition-colors border-b-2 border-transparent hover:border-background">X/TWITTER</a>
                        <a href="#" className="hover:text-background transition-colors border-b-2 border-transparent hover:border-background">GITHUB</a>
                        <a href="#" className="hover:text-background transition-colors border-b-2 border-transparent hover:border-background">DISCORD</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
