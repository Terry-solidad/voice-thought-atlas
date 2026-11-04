import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
      <Logo />
      <div className="flex items-center gap-2">
        {children}
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
