import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-5 animate-spin text-muted", className)}
      aria-label="Loading"
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="size-7" />
    </div>
  );
}
