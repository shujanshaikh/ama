interface LogoProps {
  size?: number
  mode?: "dark" | "light"
}

export function AmaLogo({ size = 48, mode = "dark" }: LogoProps) {
  const primary = mode === "dark" ? "#FFFFFF" : "#050505"
  const accent = "#E8A87C"
  const bg = mode === "dark" ? "#050505" : "#FFFFFF"

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="52" height="52" rx="12" fill={primary} />
      <path
        d="M32 16C22 16 16 24 16 32C16 40 22 48 32 48C36 48 40 46 42 43L42 48L48 48L48 24L42 24L42 28C40 20 36 16 32 16ZM32 22C38 22 42 26 42 32C42 38 38 42 32 42C26 42 22 38 22 32C22 26 26 22 32 22Z"
        fill={bg}
      />
      <circle cx="52" cy="12" r="6" fill={accent} />
    </svg>
  )
}
