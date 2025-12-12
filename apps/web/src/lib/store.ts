import { store } from "@simplestack/store";
import { chatModel } from "@ama/backend/convex/agent/models";



export const chatStore = store({
    selectedModel: chatModel[0]?.id || "",
    prompt: "",
    urls: [] as string[],
    forThreadId: "",
});


export const prompt = chatStore.select("prompt");
export const urls = chatStore.select("urls");
export const selectedModel = chatStore.select("selectedModel");
export const forThreadId = chatStore.select("forThreadId");