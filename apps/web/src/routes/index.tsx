import { createFileRoute, redirect } from "@tanstack/react-router";
import { AmaLogo } from "../components/ama-logo";
import { motion } from "motion/react";
import { PromptBox } from "@/components/prompt-box";
import { getSignInUrl } from "@/authkit/serverFunction";
import SignInButton from "@/components/sign-in-components";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

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
		<div className="min-h-screen flex flex-col font-sans bg-background text-foreground relative selection:bg-black/5 dark:selection:bg-white/10">
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

			<header className="fixed top-0 z-50 w-full transition-all duration-300">
				<div className="container h-16 max-w-5xl mx-auto flex items-center justify-between px-6">
					<div className="flex items-center gap-2">
						<AmaLogo size={32} />
						<span className="font-bold tracking-tight text-xl">ama</span>
					</div>
					<div className="flex items-center gap-3">
						<SignInButton user={user} url={url} />
						<Button asChild className="rounded-full px-5 font-medium">
							<Link to="/install">Install CLI</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
				<div className="container max-w-3xl mx-auto flex flex-col items-center text-center gap-6">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="flex flex-col items-center gap-4"
					>
						<h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
							Lovable, but for <span className="text-muted-foreground">localhost</span>.
						</h1>
						<p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
							The AI coding assistant that lives in your terminal and works with your local files.
						</p>
					</motion.div>

					<div className="w-full h-10" />

					<motion.div
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.4, delay: 0.15 }}
						className="w-full max-w-2xl"
					>
						{/* <div className="bg-card rounded-2xl p-1">
							<PromptBox
								containerClassName="max-w-full"
								className="border-0 shadow-none bg-transparent"
							/>
						</div> */}
					</motion.div>
				</div>
			</main>

			<footer className="w-full py-6 text-center text-xs text-muted-foreground/50">
				<div className="container mx-auto px-6">
					© {new Date().getFullYear()} Ama
				</div>
			</footer>
		</div>
	);
}
