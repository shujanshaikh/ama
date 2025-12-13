
import {  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon } from "lucide-react";

export function PreviewIframe() {
  return (
    <WebPreview defaultUrl="http://localhost:3003" className="h-full border-0 rounded-none bg-transparent">
      <WebPreviewNavigation>
        <WebPreviewNavigationButton
          tooltip="Go back"
          onClick={() => {
            // Navigation handled by iframe
            const iframe = document.querySelector("iframe");
            iframe?.contentWindow?.history.back();
          }}
        >
          <ArrowLeftIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton
          tooltip="Go forward"
          onClick={() => {
            const iframe = document.querySelector("iframe");
            iframe?.contentWindow?.history.forward();
          }}
        >
          <ArrowRightIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton
          tooltip="Refresh"
          onClick={() => {
            const iframe = document.querySelector("iframe");
            iframe?.contentWindow?.location.reload();
          }}
        >
          <RefreshCwIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewUrl />
      </WebPreviewNavigation>
      <WebPreviewBody />
    </WebPreview>
  );
}

