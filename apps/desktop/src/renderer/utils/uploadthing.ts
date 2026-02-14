import { generateReactHelpers } from "@uploadthing/react";
import type { FileRouter } from "uploadthing/types";
import { WEB_URL } from "../lib/constants";

// Mirror the web app's upload router type for type safety
type UploadRouter = {
  imageUploader: FileRouter[string];
};

export const { useUploadThing } = generateReactHelpers<UploadRouter>({
  url: `${WEB_URL}/api/uploadthing`,
});
