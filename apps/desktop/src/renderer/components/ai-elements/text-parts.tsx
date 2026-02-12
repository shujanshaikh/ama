import { MessageResponse } from "./message";

type TextPart = {
    type: "text";
    text: string;
};

type TextPartsProps = {
    parts: TextPart[];
    messageKey: string;
    isStreaming: boolean;
};

export function TextParts({ parts, messageKey }: TextPartsProps) {
    return (
        <>
            {parts.map((part, i) => (
                <div key={`${messageKey}-text-${i}`} className="leading-relaxed text-base text-foreground/90">
                    {part.text && (
                        <MessageResponse>{part.text}</MessageResponse>
                    )}
                </div>
            ))}
        </>
    );
}
