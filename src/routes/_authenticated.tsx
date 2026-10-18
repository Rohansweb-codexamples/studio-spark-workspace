import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessagesSquare, FolderGit2, LogOut, Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const nav = [
  { to: "/chat", icon: MessagesSquare, label: "Chat" },
  { to: "/sites", icon: FolderGit2, label: "Sites" },
] as const;

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);
  if (loading || !user) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="flex h-screen">
      <aside className="flex w-16 flex-col items-center gap-2 border-r bg-rail py-4 text-rail-foreground">
        <span className="mb-4 font-display text-lg font-bold">s<span className="text-primary">.</span></span>
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            title={n.label}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-secondary"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            <n.icon className="h-5 w-5" />
          </Link>
        ))}
        <span title="Design canvas — coming soon" className="flex h-10 w-10 items-center justify-center rounded-lg opacity-40">
          <Palette className="h-5 w-5" />
        </span>
        <button
          title="Sign out"
          onClick={() => supabase.auth.signOut()}
          className="mt-auto flex h-10 w-10 items-center justify-center rounded-lg hover:bg-secondary"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
