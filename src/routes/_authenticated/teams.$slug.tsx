import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hash, Palette, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/teams/$slug")({
  head: () => ({
    meta: [
      { title: "Team hub — Studio" },
      { name: "description", content: "Your team's chat, designs and people." },
      { property: "og:title", content: "Team hub — Studio" },
      { property: "og:description", content: "Your team's chat, designs and people." },
    ],
  }),
  component: Hub,
});

type Team = { id: string; name: string; tagline: string };

function Hub() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [designs, setDesigns] = useState<{ id: string; name: string }[]>([]);
  const [people, setPeople] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("id,name,tagline").eq("slug", slug).maybeSingle();
      setTeam(t);
      if (!t) return;
      const [c, d, m] = await Promise.all([
        supabase.from("channels").select("id,name").eq("team_id", t.id).order("created_at"),
        supabase.from("designs").select("id,name").eq("team_id", t.id).order("updated_at", { ascending: false }),
        supabase.from("team_members").select("profiles(display_name)").eq("team_id", t.id),
      ]);
      setChannels(c.data ?? []);
      setDesigns(d.data ?? []);
      setPeople((m.data ?? []).map((r: any) => r.profiles?.display_name).filter(Boolean));
    })();
  }, [slug]);

  async function newDesign() {
    if (!team || !user) return;
    const { data, error } = await supabase.from("designs").insert({ owner_id: user.id, team_id: team.id, name: "Untitled design" }).select("id").single();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/designs/$designId", params: { designId: data.id } });
  }

  if (team === undefined) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (team === null) return <div className="p-8">This team doesn't exist.</div>;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-sm font-medium text-primary">Team hub</p>
      <h1 className="text-4xl font-semibold">{team.name}</h1>
      {team.tagline && <p className="mt-1 text-muted-foreground">{team.tagline}</p>}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Channels</h2>
          <div className="mt-3 space-y-1">
            {channels.length === 0 && <p className="text-sm text-muted-foreground">No channels yet.</p>}
            {channels.map((c) => (
              <Link key={c.id} to="/chat" search={{ channel: c.id }} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />{c.name}
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Designs</h2>
            <Button size="sm" variant="ghost" onClick={newDesign}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="mt-3 space-y-1">
            {designs.length === 0 && <p className="text-sm text-muted-foreground">No designs yet.</p>}
            {designs.map((d) => (
              <Link key={d.id} to="/designs/$designId" params={{ designId: d.id }} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />{d.name}
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">People</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {people.map((p, i) => (
              <span key={i} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">{p[0]?.toUpperCase()}</span>{p}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
