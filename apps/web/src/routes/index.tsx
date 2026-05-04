import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { getSignInUrl } from "@/authkit/serverFunction";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowDownRight, Terminal, Brackets, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignInButton from "@/components/sign-in-components";
import { useRef } from "react";

const videos = [
	"https://pub-f6f7266ff5af48c8afa45503071de743.r2.dev/ama/1767525316123447.MP4",
	"https://pub-f6f7266ff5af48c8afa45503071de743.r2.dev/ama/Screen%20Recording%202026-01-04%20at%204.20.02%E2%80%AFPM.mov",
	"https://pub-f6f7266ff5af48c8afa45503071de743.r2.dev/ama/Screen%20Recording%202026-01-04%20at%204.20.02%E2%80%AFPM%203.mov",
	"https://pub-f6f7266ff5af48c8afa45503071de743.r2.dev/ama/Screen%20Recording%202026-01-04%20at%204.20.02%E2%80%AFPM%202.mov",
];

export const Route = createFileRoute("/")(
	{
		component: LandingPage,
		beforeLoad: async ({ context }) => {
			if (context.user) {
				throw redirect({ to: "/dashboard" });
			}
		},
		loader: async ({ context }) => {
			const { user } = context;
			const url = await getSignInUrl();
			return { user, url };
		},
	},
);

function LandingPage() {
	const { user, url } = Route.useLoaderData();
	const containerRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end end"]
	});

	const yLayer1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
	const yLayer2 = useTransform(scrollYProgress, [0, 1], [0, -150]);

	return (
		<div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden font-sans">
			<div className="grain-overlay" />
			
			<div className="fixed inset-0 pointer-events-none z-0">
				<div className="absolute top-0 left-1/4 w-px h-full bg-border/40 mix-blend-difference" />
				<div className="absolute top-0 left-2/4 w-px h-full bg-primary/20 mix-blend-difference" />
				<div className="absolute top-0 right-1/4 w-px h-full bg-border/40 mix-blend-difference" />
				<div className="absolute top-1/4 left-0 w-full h-px bg-border/40 mix-blend-difference" />
				<div className="absolute bottom-1/4 left-0 w-full h-px bg-border/40 mix-blend-difference" />
			</div>

			<header className="fixed top-0 w-full z-50 flex justify-end items-center px-6 py-6 md:px-12 pointer-events-none">
				<motion.div 
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					className="pointer-events-auto"
				>
					<SignInButton user={user} url={url} />
				</motion.div>
			</header>

			<section className="relative z-10 min-h-[100svh] flex flex-col justify-center pt-24 px-6 md:px-12">
				<div className="max-w-[1400px] mx-auto w-full relative">
					
					<motion.div 
						style={{ y: yLayer2 }}
						className="absolute -top-20 right-0 lg:right-24 text-primary opacity-20 pointer-events-none hidden md:block"
					>
						<Brackets size={240} strokeWidth={0.5} />
					</motion.div>

			

					<div className="relative z-20 mix-blend-difference">
						<motion.h1 className="font-display text-[12vw] leading-[0.85] tracking-tighter uppercase text-primary">
							<motion.span 
								initial={{ y: 100, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
								className="block hover:rotate-1 transition-transform"
							>
								Lovable,
							</motion.span>
							<motion.span 
								initial={{ y: 100, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
								className="block text-foreground ml-[8vw]"
							>
								But for
							</motion.span>
							<motion.span 
								initial={{ y: 100, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
								className="block text-transparent bg-clip-text"
								style={{ 
									WebkitTextStroke: "2px var(--color-foreground)",
									backgroundImage: "repeating-linear-gradient(45deg, var(--color-primary) 0, var(--color-primary) 2px, transparent 2px, transparent 8px)"
								}}
							>
								Localhost.
							</motion.span>
						</motion.h1>
					</div>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 1, delay: 0.6 }}
						className="font-mono text-base md:text-lg max-w-md mt-10 mb-10 border-l-4 border-primary pl-6"
					>
						The AI agent that lives directly in your browser. Navigates, edits, and commits to your local codebase without friction.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.8 }}
						className="flex flex-col sm:flex-row gap-4 relative z-30"
					>
						<Button asChild size="lg" className="h-14 px-6 rounded-none bg-primary text-primary-foreground hover:bg-foreground hover:text-background font-display text-xl uppercase border-2 border-transparent hover:border-primary transition-all shadow-rough">
							<Link to="/install" className="flex items-center gap-3">
								Install Now
								<ArrowDownRight className="w-5 h-5" />
							</Link>
						</Button>
						<Button asChild size="lg" className="h-14 px-6 rounded-none bg-transparent text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 font-display text-xl uppercase border-rough border-2 border-foreground shadow-rough">
							<a href="#action" className="flex items-center gap-3">
								<Play className="w-4 h-4 fill-current" /> Play Video
							</a>
						</Button>
					</motion.div>
				</div>

				<motion.div 
					style={{ y: yLayer1 }}
					initial={{ opacity: 0, rotate: 5, scale: 0.8 }}
					animate={{ opacity: 1, rotate: -2, scale: 1 }}
					transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
					className="absolute right-[-10vw] top-[20vh] md:right-12 md:top-[30vh] w-[70vw] md:w-[45vw] aspect-video border-rough border-4 border-foreground shadow-[12px_12px_0px_0px_var(--color-primary)] z-10 bg-background overflow-hidden group"
				>
					<video autoPlay loop muted playsInline className="w-full h-full object-cover grayscale opacity-90 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700">
						<source src={videos[0]} type="video/mp4" />
					</video>
					<div className="absolute top-2 left-2 bg-foreground text-background font-mono text-[10px] px-2 py-1 z-20 uppercase font-bold mix-blend-luminosity">
						REC_01 // INIT
					</div>
				</motion.div>
			</section>

			<div className="w-full bg-primary text-primary-foreground py-2 border-y-2 border-foreground overflow-hidden whitespace-nowrap shadow-rough relative z-20 flex items-center transform -rotate-1 origin-left mt-24">
				<motion.div
					animate={{ x: ["0%", "-50%"] }}
					transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
					className="font-display text-3xl uppercase tracking-wider flex items-center gap-8"
				>
					{[...Array(12)].map((_, i) => (
						<span key={i} className="flex items-center gap-8">
							<span>A MINI AGENT</span>
							<span className="w-2 h-2 bg-foreground rounded-full" />
							<span>AUTONOMOUS CODE</span>
							<span className="w-2 h-2 bg-foreground rounded-full" />
						</span>
					))}
				</motion.div>
			</div>

			<div id="action" className="h-24" />

			<section className="relative z-10 px-6 md:px-12 pb-32">
				<div className="max-w-[1600px] mx-auto">
					
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-32">
						<div className="lg:col-span-5 order-2 lg:order-1 relative">
							<div className="absolute -left-6 top-0 w-2 h-full bg-primary" />
							<h2 className="font-display text-5xl md:text-7xl leading-none uppercase text-foreground mb-4 mix-blend-difference">
								Editor <br /> Required.
							</h2>
							<div className="font-mono text-base text-muted-foreground p-4 border-rough border-2 border-foreground bg-accent/5 relative shadow-rough before:absolute before:top-0 before:-right-2 before:w-2 before:h-full before:bg-primary">
								Edit code with the familiar VS Code interface directly attached to your browser context. Seamless. Unapologetic. Fully integrated.
							</div>
						</div>
						<motion.div 
							initial={{ opacity: 0, x: 50 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							className="lg:col-span-7 order-1 lg:order-2"
						>
							<div className="p-3 bg-muted border-2 border-foreground shadow-[8px_8px_0px_var(--color-primary)] input-rough relative">
								<div className="flex gap-2 mb-3">
									<div className="w-3 h-3 rounded-full border-2 border-foreground bg-destructive" />
									<div className="w-3 h-3 rounded-full border-2 border-foreground bg-primary" />
									<div className="w-3 h-3 rounded-full border-2 border-foreground bg-foreground" />
								</div>
								<div className="aspect-video bg-background border-2 border-foreground overflow-hidden relative group">
									<video autoPlay loop muted playsInline className="w-full h-full object-cover filter contrast-125 saturate-50 group-hover:saturate-100 transition-all duration-1000">
										<source src={videos[1]} type="video/quicktime" />
										<source src={videos[1]} type="video/mp4" />
									</video>
								</div>
							</div>
						</motion.div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 lg:gap-24 relative mt-16">
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[20vw] text-primary/5 pointer-events-none whitespace-nowrap rotate-90 md:rotate-0">
							SYS.CALL
						</div>

						<motion.div 
							initial={{ opacity: 0, y: 100 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							className="md:mt-24"
						>
							<div className="border-rough border-2 border-foreground bg-background shadow-[-12px_12px_0px_var(--color-primary)] relative z-10 p-2">
								<div className="absolute -top-5 -right-5 bg-foreground text-background font-mono px-3 py-1 text-xs uppercase transform rotate-6 border-2 border-background">
									@Context Inject
								</div>
								<video autoPlay loop muted playsInline className="w-full aspect-[4/3] object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 border-2 border-foreground">
									<source src={videos[2]} type="video/quicktime" />
									<source src={videos[2]} type="video/mp4" />
								</video>
							</div>
							<div className="mt-8">
								<h3 className="font-display text-4xl uppercase border-b-4 border-primary inline-block mb-3 pt-2">Call Out Files</h3>
								<p className="font-mono text-muted-foreground text-base italic">
									Speed typing, extreme precision: type '@' to immediately siphon files into context. Pure control.
								</p>
							</div>
						</motion.div>

						<motion.div 
							initial={{ opacity: 0, y: 100 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							className="md:-mt-10"
						>
							<div className="mt-8 mb-8 text-right flex flex-col items-end">
								<h3 className="font-display text-4xl uppercase text-foreground bg-primary/20 px-2 mix-blend-luminosity mb-3 inline-block pt-2">Diff & Destroy</h3>
								<p className="font-mono text-muted-foreground text-base max-w-sm text-right">
									Review modifications raw and uncut. Accept the genius, reject the noise. Complete autonomy.
								</p>
							</div>
							<div className="border-rough border-2 border-foreground bg-background p-2 shadow-rough relative z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
								<video autoPlay loop muted playsInline className="w-full aspect-square md:aspect-[4/3] object-cover border-2 border-foreground">
									<source src={videos[3]} type="video/quicktime" />
									<source src={videos[3]} type="video/mp4" />
								</video>
							</div>
						</motion.div>
					</div>

				</div>
			</section>

			<section className="relative py-32 border-y-4 border-foreground bg-foreground overflow-hidden">
				<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPHBhdGggZD0iTTAgMEg0VjRIMFowIiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-50" />
				<div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
					<motion.h2 
						initial={{ scale: 0.9, opacity: 0 }}
						whileInView={{ scale: 1, opacity: 1 }}
						className="font-display text-6xl md:text-[8rem] leading-none uppercase text-background mix-blend-overlay"
					>
						Reboot Work.
					</motion.h2>
					
					<div className="mt-12 relative inline-block group">
						<div className="absolute inset-0 bg-primary blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
						<Button asChild size="lg" className="relative h-20 px-10 rounded-none bg-primary text-primary-foreground hover:bg-background hover:text-foreground font-display text-2xl uppercase border-4 border-background hover:border-primary transition-colors shadow-[0_0_30px_var(--color-primary)]">
							<Link to="/install" className="flex items-center gap-4">
								Initialize Ama
								<ArrowRight className="w-8 h-8 group-hover:translate-x-3 transition-transform" />
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<footer className="bg-background pt-20 pb-10 px-6 md:px-12 border-t-8 border-primary relative z-10">
				<div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 font-mono uppercase text-xs font-bold tracking-tight">
					<div className="col-span-1 md:col-span-2">
						<div className="flex items-center gap-3 mb-6">
							<Terminal className="w-5 h-5 text-primary" />
							<span className="font-display text-2xl tracking-widest">AMA.DEV</span>
						</div>
						<p className="text-muted-foreground w-3/4">The rogue agent in your browser. Navigating the depths of localhost with unprecedented elegance.</p>
					</div>
					
					<div>
						<h3 className="text-primary mb-4 border-b-2 border-foreground pb-2 inline-block">Resources</h3>
						<ul className="space-y-3">
							<li><Link to="/install" className="hover:text-primary transition-colors hover:pl-2 inline-block relative before:content-['>'] before:absolute before:-left-4 before:opacity-0 hover:before:opacity-100 before:text-primary">Installation File</Link></li>
							<li><a href="#" className="hover:text-primary transition-colors hover:pl-2 inline-block relative before:content-['>'] before:absolute before:-left-4 before:opacity-0 hover:before:opacity-100 before:text-primary">Documentation</a></li>
						</ul>
					</div>

					<div>
						<h3 className="text-primary mb-4 border-b-2 border-foreground pb-2 inline-block">Network</h3>
						<ul className="space-y-3">
							<li><a href="https://x.com/amadotdev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex justify-between border-b border-muted-foreground/30 pb-1">X/Twitter <span>↗</span></a></li>
							<li><a href="#" className="hover:text-primary transition-colors flex justify-between border-b border-muted-foreground/30 pb-1">GitHub <span>↗</span></a></li>
							<li><a href="#" className="hover:text-primary transition-colors flex justify-between border-b border-muted-foreground/30 pb-1">Discord <span>↗</span></a></li>
						</ul>
					</div>
				</div>

				<div className="max-w-[1600px] mx-auto mt-20 pt-6 border-t-2 border-foreground flex flex-col md:flex-row justify-between items-center text-[10px] font-mono font-bold text-muted-foreground gap-4">
					<div>SYS.DATE: {new Date().getFullYear()}</div>
					<div className="bg-foreground text-background px-3 py-1">ALL SYSTEMS OPERATIONAL</div>
					<div>VERSION: 1.0.0-ALPHA</div>
				</div>
			</footer>
		</div>
	);
}

