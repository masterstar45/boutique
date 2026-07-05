import { Spinner } from "@/components/ui/spinner";

/** Centered full-screen spinner used for route/auth loading states. */
export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}
