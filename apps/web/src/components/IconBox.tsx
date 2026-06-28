import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type IconColor =
  | "emerald"
  | "blue"
  | "purple"
  | "orange"
  | "rose"
  | "cyan"
  | "amber"
  | "indigo"
  | "teal"
  | "red";

const colorMap: Record<IconColor, string> = {
  emerald: "icon-emerald",
  blue: "icon-blue",
  purple: "icon-purple",
  orange: "icon-orange",
  rose: "icon-rose",
  cyan: "icon-cyan",
  amber: "icon-amber",
  indigo: "icon-indigo",
  teal: "icon-teal",
  red: "icon-red",
};

interface IconBoxProps {
  icon: LucideIcon;
  color: IconColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IconBox({ icon: Icon, color, size = "md", className }: IconBoxProps) {
  const sizeClass = size === "sm" ? "icon-box-sm" : size === "lg" ? "icon-box-lg" : "icon-box-md";
  const iconSize = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-7 w-7" : "h-6 w-6";

  return (
    <div className={cn(sizeClass, colorMap[color], className)}>
      <Icon className={iconSize} strokeWidth={2.25} />
    </div>
  );
}
