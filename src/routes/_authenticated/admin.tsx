import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Link2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { createAccount, listAccounts } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Studio" },
      { name: "description", content: "Create accounts, teams and team sign-in links." },
      { property: "og:title", content: "Admin — Studio" },
      { property: "og:description", content: "Create accounts, teams and team sign-in links." },
    ],
  }),
  component: Admin,
});

type Team = { id: string; name: string; slug: string; tagline: string };
type Account = { id: string; email: string; name: string; last_sign_in_at: string | null };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function Admin() {
  const isAdmin = useIsAdmin();
  const create = useServerFn(createAccount);
  const list = useServerFn(listAccounts);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<{ team_id: string; user_id: string }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [acc, setAcc] = useState({ name: "", email: "", password: "", teamId: "", admin: false });
  const [team, setTeam] = useState({ name: "", tagline: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("teams").select("id,name,slug,tagline").order("created_at"),
      supabase.from("team_members").select("team_id,user_id"),
    ]);
    setTeams(t ?? []);
    setMembers(m ?? []);
    try { setAccounts(await list()); } catch (e) { toast.error((e as Error).message); }
  }

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin]);

  if (isAdmin === null) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-8"><h1 className="text-2xl font-semibold">Admins only</h1><p className="mt-2 text-muted-foreground">You don't have access to this page.</p></div>;

  const portal = (slug: string) => `${window.location.origin}/t/${slug}`;

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { ...acc, teamId: acc.teamId || null } });
      toast.success(`Account created for ${acc.email}`);
      setAcc({ name: "", email: "", password: "", teamId: acc.teamId, admin: false });
      load();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }

  async function submitTeam(e: React.FormEvent) {
    e.preventDefault();
    const name = team.name.trim();
    if (!name) return;
    const slug = slugify(name) || "team";
    const { error } = await supabase.from("teams").insert({ name, slug, tagline: team.tagline.trim() });
    if (error) { toast.error(error.message.includes("duplicate") ? "A team with that name already exists" : error.message); return; }
    await supabase.from("channels").insert({ name: "general", team_id: (await supabase.from("teams").select("id").eq("slug", slug).single()).data!.id, created_by: (await supabase.auth.getUser()).data.user!.id });
    setTeam({ name: "", tagline: "" });
    toast.success("Team created");
    load();
  }

  async function addMember(teamId: string, userId: string) {
    if (!userId) return;
    const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
    if (error) toast.error(error.message); else load();
  }

  async function removeMember(teamId: string, userId: string) {
    await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
    load();
  }

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name || accounts.find((a) => a.id === id)?.email || "Member";

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="mt-1 text-muted-foreground">Only admins can create accounts. Send each team its sign-in link.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitAccount} className="space-y-3 rounded-xl border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4 text-primary" />New account</h2>
          <div className="space-y-1.5"><Label>Name</Label><Input value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Password</Label><Input type="text" minLength={8} value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} required placeholder="At least 8 characters" /></div>
          <div className="space-y-1.5">
            <Label>Team</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={acc.teamId} onChange={(e) => setAcc({ ...acc, teamId: e.target.value })}>
              <option value="">No team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={acc.admin} onChange={(e) => setAcc({ ...acc, admin: e.target.checked })} /> Make admin</label>
          <Button className="w-full" disabled={busy}>Create account</Button>
        </form>

        <form onSubmit={submitTeam} className="space-y-3 rounded-xl border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4 text-primary" />New team portal</h2>
          <div className="space-y-1.5"><Label>Team name</Label><Input value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Welcome line</Label><Input value={team.tagline} onChange={(e) => setTeam({ ...team, tagline: e.target.value })} placeholder="Shown on the team's sign-in page" /></div>
          <Button className="w-full">Create team</Button>
        </form>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Teams</h2>
      <div className="mt-4 space-y-4">
        {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}
        {teams.map((t) => {
          const ids = members.filter((m) => m.team_id === t.id).map((m) => m.user_id);
          return (
            <div key={t.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" />{portal(t.slug)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(portal(t.slug)); toast.success("Sign-in link copied"); }}>
                  <Copy className="mr-1 h-3.5 w-3.5" />Copy sign-in link
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {ids.map((id) => (
                  <span key={id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
                    {nameOf(id)}
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => removeMember(t.id, id)} title="Remove">×</button>
                  </span>
                ))}
                <select className="h-7 rounded-full border bg-background px-2 text-xs" value="" onChange={(e) => addMember(t.id, e.target.value)}>
                  <option value="">+ Add member</option>
                  {accounts.filter((a) => !ids.includes(a.id)).map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-12 text-xl font-semibold">Accounts</h2>
      <div className="mt-4 divide-y rounded-xl border bg-card">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <div><p className="font-medium">{a.name || "—"}</p><p className="text-muted-foreground">{a.email}</p></div>
            <span className="text-xs text-muted-foreground">{a.last_sign_in_at ? `Last in ${new Date(a.last_sign_in_at).toLocaleDateString()}` : "Never signed in"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
