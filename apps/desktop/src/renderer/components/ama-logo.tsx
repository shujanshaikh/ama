interface LogoProps {
    size?: number
}

export function AmaLogo({ size = 48 }: LogoProps) {
    const id = `selector-${size}`

    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#BE185D" />
                </linearGradient>
            </defs>
            <rect x="8" y="16" width="36" height="36" rx="8" fill="white" fillOpacity="0.15" />
            <rect x="20" y="12" width="36" height="36" rx="8" fill={`url(#${id}-grad)`} />
            <circle cx="52" cy="16" r="4" fill="white" />
        </svg>
    )
}
