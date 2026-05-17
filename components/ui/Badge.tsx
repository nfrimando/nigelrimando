interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "warm";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
  const variants = {
    default: "bg-surface-alt border-border text-muted",
    accent: "bg-accent/10 border-accent/20 text-accent",
    warm: "bg-warm/10 border-warm/20 text-warm",
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}
