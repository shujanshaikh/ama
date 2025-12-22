import { createFileRoute, redirect } from "@tanstack/react-router";
import { AmaLogo } from "../components/ama-logo";
import { motion } from "motion/react";
import { PromptBox } from "@/components/prompt-box";
import { getSignInUrl } from "@/authkit/serverFunction";
import SignInButton from "@/components/sign-in-components";

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
		<div className="min-h-screen flex flex-col font-sans bg-background selection:bg-primary/10">
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
				<div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
			</div>

			<header className="sticky top-0 z-50 w-full border-b border-border/5">
				<div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-6">
					<div className="flex items-center gap-3">
						<AmaLogo size={36} />
					</div>
					<div className="flex items-center gap-4">
						<SignInButton user={user} url={url} />
					</div>
				</div>
			</header>

			<main className="flex-1 flex flex-col items-center justify-center relative px-4 z-10 pb-20">
				<div className="container max-w-4xl mx-auto flex flex-col items-center justify-center gap-6 text-center -mt-10">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
						className="flex flex-col items-center gap-4"
					>
						<h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
							Introducing <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-accent to-primary/80">ama</span>
						</h1>
						<p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground font-medium tracking-tight">
							Lovable, but for <span className="text-foreground border-b border-primary/20">localhost</span>.
						</p>
					</motion.div>
				</div>

				<div className="h-12 md:h-16" />

				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="w-full max-w-2xl mx-auto relative group px-2"
				>
					<div className="relative">
						<PromptBox
							containerClassName="max-w-full"
							className="shadow-2xl shadow-primary/5 border-border/40 bg-background/80 backdrop-blur-sm"
						/>
					</div>
				</motion.div>
			</main>

			<footer className="w-full py-8 text-center text-xs text-muted-foreground/30 relative z-10">
				<div className="container mx-auto px-6">
					© {new Date().getFullYear()} Ama, Inc.
				</div>
			</footer>
		</div>
	);
}
