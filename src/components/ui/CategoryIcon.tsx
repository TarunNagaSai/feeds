import { createElement } from "react";
import {
  BrainCircuit,
  Cog,
  Cpu,
  Hash,
  MonitorPlay,
  Network,
  Newspaper,
  Rss,
  Sigma,
  Smartphone,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/** Icon names referenced by seed categories + a few extras, with a fallback. */
const MAP: Record<string, LucideIcon> = {
  BrainCircuit,
  Cpu,
  Sigma,
  Cog,
  Network,
  TrendingUp,
  Smartphone,
  Rss,
  MonitorPlay,
  Newspaper,
  Sparkles,
  Hash,
};

/** Resolve a lucide icon component from a stored icon name. */
export function categoryLucide(name?: string): LucideIcon {
  return (name && MAP[name]) || Hash;
}

/** All selectable icon names (for the category form). */
export const CATEGORY_ICON_OPTIONS = Object.keys(MAP);

export function CategoryIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  // Selected from a module-level static map, so use createElement rather than a
  // render-local <Icon/> (which the static-components lint rule flags).
  return createElement(categoryLucide(name), {
    className,
    "aria-hidden": "true",
  });
}
