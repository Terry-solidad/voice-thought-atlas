import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-foreground">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary">
        <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
      </span>
      <span className="font-display text-2xl leading-none">Echo</span>
    </Link>
  );
}
