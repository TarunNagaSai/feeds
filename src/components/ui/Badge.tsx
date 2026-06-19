import { cn } from "@/lib/cn";

/** Small pill label. Pass inline `style` for category-colored variants. */
export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className
      )}
      {...props}
    />
  );
}
