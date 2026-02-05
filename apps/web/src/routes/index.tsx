import { createFileRoute, redirect } from "@tanstack/react-router";
import { AmaLogo } from "../components/ama-logo";
import { motion } from "motion/react";
import { getSignInUrl } from "@/authkit/serverFunction";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignInButton from "@/components/sign-in-components";

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

	return (
		<div className="min-h-screen bg-background text-foreground selection:bg-orange-500 selection:text-white">
			{/* Grid pattern background */}
			<div
				className="fixed inset-0 opacity-[0.03] pointer-events-none"
				style={{
					backgroundImage: `linear-gradient(currentColor 1px, transparent 1px),
                           linear-gradient(90deg, currentColor 1px, transparent 1px)`,
					backgroundSize: "80px 80px",
				}}
			/>

			{/* Vertical line accent */}
			<motion.div
				initial={{ scaleY: 0 }}
				animate={{ scaleY: 1 }}
				transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
				className="absolute top-0 right-[15%] md:right-[20%] w-px h-[40vh] bg-gradient-to-b from-orange-500/60 via-orange-500/20 to-transparent origin-top hidden sm:block"
			/>

			{/* Sign Up Button - Top Right */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.3 }}
				className="fixed top-6 right-6 z-50"
			>
				<SignInButton user={user} url={url} />
			</motion.div>

			{/* Hero */}
			<section className="relative z-10 border-b-2 border-foreground">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-20 md:py-32">
					<div className="max-w-4xl">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								duration: 0.6,
								delay: 0.1,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="flex items-center gap-4 mb-8"
						>
							<div className="w-8 h-px bg-orange-500" />
							<span className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground">
								ama (a mini agent)
							</span>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.7,
								delay: 0.2,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-8 uppercase"
						>
							<span className="block">Lovable, but for</span>
							<span className="text-orange-500 relative">
								localhost
								<motion.span
									initial={{ scaleX: 0 }}
									animate={{ scaleX: 1 }}
									transition={{
										duration: 0.5,
										delay: 0.7,
										ease: [0.22, 1, 0.36, 1],
									}}
									className="absolute -bottom-1 left-0 w-full h-[3px] bg-orange-500/30 origin-left"
								/>
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.6,
								delay: 0.35,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="text-base sm:text-lg text-muted-foreground max-w-lg mb-12 leading-relaxed"
						>
							ai agent that lives in your browser and makes changes to your
							local codebase.
						</motion.p>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.6,
								delay: 0.45,
								ease: [0.22, 1, 0.36, 1],
							}}
						>
							<Button asChild size="lg" className="group font-black uppercase rounded-none bg-orange-500 hover:bg-orange-600 text-white">
								<Link to="/install" className="flex items-center gap-2">
									Get Started
									<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
								</Link>
							</Button>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Demo 1 - See ama in action */}
			<section className="relative z-10 border-b-2 border-foreground">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-20">
					<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 max-w-xl"
						>
							<div className="flex items-center gap-4 mb-6">
								<div className="w-8 h-px bg-orange-500" />
								<span className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground">
									Demo
								</span>
							</div>
							<h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 uppercase">
								See ama in action
							</h2>
							<p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
								Watch how ama works with your local codebase.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 w-full lg:max-w-2xl"
						>
							<div className="relative border-2 border-foreground overflow-hidden group hover:border-orange-500 transition-colors">
								<div className="aspect-video bg-muted">
									<video
										autoPlay
										loop
										muted
										playsInline
										className="w-full h-full object-cover"
									>
										<source src={videos[0]} type="video/mp4" />
									</video>
								</div>
								<div className="absolute top-0 left-0 bg-orange-500 text-white px-3 py-1 font-black text-xs">
									DEMO_01
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Demo 2 - VS Code in browser */}
			<section className="relative z-10 border-b-2 border-foreground">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-20">
					<div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 max-w-xl"
						>
							<div className="flex items-center gap-4 mb-6">
								<div className="w-8 h-px bg-orange-500" />
								<span className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground">
									VS Code in browser
								</span>
							</div>
							<h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 uppercase">
								Full editor experience
							</h2>
							<p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
								Edit code with the familiar VS Code interface right in your
								browser.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 w-full lg:max-w-2xl"
						>
							<div className="relative border-2 border-foreground overflow-hidden group hover:border-orange-500 transition-colors">
								<div className="aspect-video bg-muted">
									<video
										autoPlay
										loop
										muted
										playsInline
										className="w-full h-full object-cover"
									>
										<source src={videos[1]} type="video/quicktime" />
										<source src={videos[1]} type="video/mp4" />
									</video>
								</div>
								<div className="absolute top-0 left-0 bg-orange-500 text-white px-3 py-1 font-black text-xs">
									DEMO_02
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Demo 3 - Preview Window */}
			<section className="relative z-10 border-b-2 border-foreground">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-20">
					<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 max-w-xl"
						>
							<div className="flex items-center gap-4 mb-6">
								<div className="w-8 h-px bg-orange-500" />
								<span className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground">
									Preview Window
								</span>
							</div>
							<h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 uppercase">
								Type @ to select context
							</h2>
							<p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
								Easily reference files and add context by typing @ in the chat.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 w-full lg:max-w-2xl"
						>
							<div className="relative border-2 border-foreground overflow-hidden group hover:border-orange-500 transition-colors">
								<div className="aspect-video bg-muted">
									<video
										autoPlay
										loop
										muted
										playsInline
										className="w-full h-full object-cover"
									>
										<source src={videos[2]} type="video/quicktime" />
										<source src={videos[2]} type="video/mp4" />
									</video>
								</div>
								<div className="absolute top-0 left-0 bg-orange-500 text-white px-3 py-1 font-black text-xs">
									DEMO_03
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Demo 4 - Accept/Reject */}
			<section className="relative z-10 border-b-2 border-foreground">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-20">
					<div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 max-w-xl"
						>
							<div className="flex items-center gap-4 mb-6">
								<div className="w-8 h-px bg-orange-500" />
								<span className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground">
									Accept / Reject
								</span>
							</div>
							<h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 uppercase">
								Accept or reject changes
							</h2>
							<p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
								Review changes made by the agent and choose to accept or reject
								them.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="flex-1 w-full lg:max-w-2xl"
						>
							<div className="relative border-2 border-foreground overflow-hidden group hover:border-orange-500 transition-colors">
								<div className="aspect-video bg-muted">
									<video
										autoPlay
										loop
										muted
										playsInline
										className="w-full h-full object-cover"
									>
										<source src={videos[3]} type="video/quicktime" />
										<source src={videos[3]} type="video/mp4" />
									</video>
								</div>
								<div className="absolute top-0 left-0 bg-orange-500 text-white px-3 py-1 font-black text-xs">
									DEMO_04
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="relative z-10 border-b-2 border-foreground">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-20">
					<div className="text-center mb-12">
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							className="text-3xl sm:text-4xl font-black tracking-tight mb-8 uppercase"
						>
							Try ama now.
						</motion.h2>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.1 }}
						>
							<Button asChild variant="outline" size="lg" className="group font-black uppercase rounded-none border-2 border-foreground hover:bg-orange-500 hover:text-white hover:border-orange-500">
								<Link to="/install" className="flex items-center gap-2">
									Get started
									<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
								</Link>
							</Button>
						</motion.div>
					</div>

					<div className="w-full h-px bg-foreground my-12" />

					{/* Footer Grid */}
					<div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 max-w-2xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
						>
							<h3 className="text-xs font-medium lowercase mb-4 text-muted-foreground">
								resources
							</h3>
							<ul className="space-y-2">
								<li>
									<Link
										to="/install"
										className="text-sm font-medium lowercase text-foreground/60 hover:text-orange-500 transition-colors"
									>
										installation
									</Link>
								</li>
							</ul>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.1 }}
						>
							<h3 className="text-xs font-medium lowercase mb-4 text-muted-foreground">
								company
							</h3>
							<ul className="space-y-2">
								<li>
									<a
										href="https://x.com/amadotdev"
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm font-medium lowercase text-foreground/60 hover:text-orange-500 transition-colors"
									>
										x (twitter)
									</a>
								</li>
							</ul>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.2 }}
						>
							<h3 className="text-xs font-medium lowercase mb-4 text-muted-foreground">
								legal
							</h3>
							<ul className="space-y-2">
								<li>
									<Link
										to="/"
										className="text-sm font-medium lowercase text-foreground/60 hover:text-orange-500 transition-colors"
									>
										terms
									</Link>
								</li>
								<li>
									<Link
										to="/"
										className="text-sm font-medium lowercase text-foreground/60 hover:text-orange-500 transition-colors"
									>
										privacy
									</Link>
								</li>
							</ul>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Bottom Footer */}
			<footer className="relative z-10 border-t border-border">
				<div className="max-w-[1800px] mx-auto px-6 md:px-16 lg:px-24 py-6">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						<div className="text-sm font-medium lowercase text-muted-foreground">
							ama.dev
						</div>
						<div className="flex gap-6 text-sm font-medium lowercase">
							<a
								href="https://x.com/amadotdev"
								target="_blank"
								rel="noopener noreferrer"
								className="text-foreground/60 hover:text-orange-500 transition-colors"
							>
								twitter
							</a>
							<a
								href="#"
								className="text-foreground/60 hover:text-orange-500 transition-colors"
							>
								github
							</a>
							<a
								href="#"
								className="text-foreground/60 hover:text-orange-500 transition-colors"
							>
								discord
							</a>
						</div>
						<div className="text-sm font-medium lowercase text-muted-foreground">
							&copy; 2026
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
