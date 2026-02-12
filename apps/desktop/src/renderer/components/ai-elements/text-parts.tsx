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
                <div key={`${messageKey}-text-${i}`} className="text-[14.5px] leading-[1.7] text-foreground/85">
                    {part.text && (
                        <MessageResponse>{part.text}</MessageResponse>
                    )}
                </div>
            ))}
        </>
    );
}
