CREATE TABLE "ama_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ama_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"model" text,
	"parts" jsonb NOT NULL,
	"role" varchar NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ama_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"cwd" text NOT NULL,
	"git_repo" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "Stream" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "ama_chat" ADD CONSTRAINT "ama_chat_project_id_ama_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ama_project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ama_message" ADD CONSTRAINT "ama_message_chat_id_ama_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."ama_chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_ama_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."ama_chat"("id") ON DELETE no action ON UPDATE no action;