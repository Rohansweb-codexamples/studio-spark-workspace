import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/teams/")({
  head: () => ({
    meta: [
      { title: "Teams — Studio" },
      { name: "description", content: "Your team hubs in Studio." },
      { property: "og:title", content: "Teams — Studio" },
      { property: "og:description", content: "Your team hubs in Studio." },
    ],
  }),
  component: Teams,
});

function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<{ id: string; name: string; slug: string; tagline: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("team_members")
      .select("teams(id,name,slug,tagline)")
      .eq("user_id", user.id)
      .then(({ data }) => setTeams((data ?? []).map((r: any) => r.teams).filter(Boolean)));
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-3xl font-semibold">Your teams</h1>
      <p className="mt-1 text-muted-foreground">Open a team hub to see its chat, designs and people.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {teams.length === 0 && <p className="text-sm text-muted-foreground">You're not in a team yet. Ask an admin to add you.</p>}
        {teams.map((t) => (
          <Link key={t.id} to="/teams/$slug" params={{ slug: t.slug }} className="rounded-xl border bg-card p-6 shadow-soft hover:border-primary">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t.name}</h3>
            <p className="text-sm text-muted-foreground">{t.tagline || "Team hub"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
