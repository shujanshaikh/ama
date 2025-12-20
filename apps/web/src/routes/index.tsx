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
		<div className="min-h-screen  flex flex-col font-sans">
			<header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-6">
					<div className="flex items-center gap-2">
						<AmaLogo size={42} />
						{/* <span className="font-bold text-xl tracking-tight hidden md:block">ama</span> */}
					</div>
					<div className="flex items-center gap-4">
						<SignInButton user={user} url={url} />
					</div>
				</div>
			</header>

			<main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4" style={{ minHeight: "40vh" }}>
				<div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
					<div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
				</div>

				<div className="container max-w-4xl mx-auto flex flex-row items-center justify-center gap-4 z-10 -mt-50">
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="text-3xl md:text-5xl lg:text-6xl italic tracking-tight text-center leading-[1.1] whitespace-nowrap"
					>
						Introducing <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">ama</span> lovable but for localhost.
					</motion.h1>
				</div>
				<div className="h-10 md:h-16" />
				<div className="w-full max-w-2xl mx-auto">
					<PromptBox/>
				</div>
			</main>

			<footer className="w-full py-6 text-center text-xs text-muted-foreground/40 absolute bottom-0">
				<div className="container mx-auto px-6">
					© {new Date().getFullYear()} Ama, Inc.
				</div>
			</footer>
		</div>
	);
}
