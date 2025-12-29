import { createFileRoute, redirect } from "@tanstack/react-router";
import { AmaLogo } from "../components/ama-logo";
import { motion } from "motion/react";
import { getSignInUrl } from "@/authkit/serverFunction";
import SignInButton from "@/components/sign-in-components";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";


export const Route = createFileRoute("/")({
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
});

function LandingPage() {
	const { user, url } = Route.useLoaderData();

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.03]"
				style={{
					backgroundImage: `
						linear-gradient(to right, currentColor 1px, transparent 1px),
						linear-gradient(to bottom, currentColor 1px, transparent 1px)
					`,
					backgroundSize: "80px 80px",
				}}
			/>
			<motion.div
				initial={{ scaleY: 0 }}
				animate={{ scaleY: 1 }}
				transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
				className="absolute top-0 right-[15%] md:right-[20%] w-px h-[40vh] bg-gradient-to-b from-primary/60 via-primary/20 to-transparent origin-top hidden sm:block"
			/>

			<header className="relative z-10 w-full py-6 px-8 md:px-16 lg:px-24">
				<div className="flex items-center justify-between">
					<motion.div
						initial={{ opacity: 0, x: -12 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
						className="flex items-center gap-2.5"
					>
						<AmaLogo size={32} />
						
					</motion.div>
					<motion.div
						initial={{ opacity: 0, x: 12 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
						className="flex items-center gap-4"
					>
						<SignInButton user={user} url={url} />
					</motion.div>
				</div>
			</header>

			<main className="relative z-10 flex-1 flex items-center px-8 md:px-16 lg:px-24 py-16">
				<div className="w-full max-w-4xl">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
						className="flex items-center gap-4 mb-8"
					>
						<div className="w-8 h-px bg-primary" />
						<span className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
							ama (a mini agent)
						</span>
					</motion.div>

					<motion.h1
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
						className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-8"
					>
						<span className="block">Lovable, but for</span>
						<span className="text-primary relative">
							localhost
							<motion.span
								initial={{ scaleX: 0 }}
								animate={{ scaleX: 1 }}
								transition={{ duration: 0.5, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
								className="absolute -bottom-1 left-0 w-full h-[3px] bg-primary/30 origin-left"
							/>
						</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
						className="text-base sm:text-lg text-muted-foreground max-w-lg mb-12 leading-relaxed"
					>
						ai agent that lives in your browser and makes changes to your local codebase.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
					>
						<Button
							asChild
							size="lg"
							className="rounded-lg px-8 font-medium group relative overflow-hidden"
						>
							<Link to="/install" className="flex items-center gap-2">
								Get Started
								<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
							</Link>
						</Button>
					</motion.div>
				</div>
			</main>

			<section className="relative z-10 w-full border-t border-border">
				<div className="px-8 md:px-16 lg:px-24 py-20">
					<div className="text-center mb-12">
						<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
							Try ama now.
						</h2>
						<Button
							asChild
							variant="secondary"
							size="lg"
							className="rounded-full px-6 font-medium group"
						>
							<Link to="/install" className="flex items-center gap-2">
								Get started
								<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
							</Link>
						</Button>
					</div>

					<div className="w-full h-px bg-border my-12" />

					<div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 max-w-3xl mx-auto">
						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-4">
								Resources
							</h3>
							<ul className="space-y-3">
								<li>
									<Link
										to="/install"
										className="text-sm text-foreground/80 hover:text-foreground transition-colors"
									>
										Installation
									</Link>
								</li>

							</ul>
						</div>

						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-4">
								Company
							</h3>
							<ul className="space-y-3">
								<li>
									<a
										href="https://x.com/amadotdev"
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-foreground/80 hover:text-foreground transition-colors"
									>
										X (Twitter)
									</a>
								</li>
							</ul>
						</div>

						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-4">
								Legal
							</h3>
							<ul className="space-y-3">
								<li>
									<Link
										to="/"
										className="text-sm text-foreground/80 hover:text-foreground transition-colors"
									>
										Terms of Service
									</Link>
								</li>
								<li>
									<Link
										to="/"
										className="text-sm text-foreground/80 hover:text-foreground transition-colors"
									>
										Privacy Policy
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
