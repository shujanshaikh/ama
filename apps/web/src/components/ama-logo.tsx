import { type SVGProps } from "react";

interface AmaLogoProps extends SVGProps<SVGSVGElement> {
    size?: number;
}

export function AmaLogo({ size = 40, className, ...props }: AmaLogoProps) {
    const height = size;
    const width = size * 2.4;

    return (
        <svg
            viewBox="0 0 96 40"
            width={width}
            height={height}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >

            <path
                d="M2 4L2 20L6 16.5L9 22L12 20.5L9 15L15 13.5L2 4Z"
                fill="currentColor"
            />

            <g fill="currentColor">
                <path
                    d="M24 31C24 31 24 27 24 25C24 21.5 27.5 19 32 19C36.5 19 40 21.5 40 25C40 27 40 31 40 31"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <path
                    d="M24 27H40"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                <path
                    d="M48 31V23C48 20.5 49.5 19 52 19C54.5 19 56 20.5 56 23V31"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <path
                    d="M56 23C56 20.5 57.5 19 60 19C62.5 19 64 20.5 64 23V31"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />

                <path
                    d="M72 31C72 31 72 27 72 25C72 21.5 75.5 19 80 19C84.5 19 88 21.5 88 25C88 27 88 31 88 31"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <path
                    d="M72 27H88"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}
    
export function AmaIcon({
    size = 32,
    className,
    ...props
}: Omit<AmaLogoProps, "showText">) {
    return (
        <svg
            viewBox="0 0 24 32"
            width={size * 0.75}
            height={size}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M2 2L2 26L8 20L13 30L19 27L14 18L24 15L2 2Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default AmaLogo;
