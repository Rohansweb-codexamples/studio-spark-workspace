import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderGit2, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { starterFiles } from "@/lib/site-bundle";

export const Route = createFileRoute("/_authenticated/sites/")({
  head: () => ({
    meta: [
      { title: "Sites — Studio" },
      { name: "description", content: "Your site repositories in Studio." },
      { property: "og:title", content: "Sites — Studio" },
      { property: "og:description", content: "Your site repositories in Studio." },
    ],
  }),
  component: Sites,
});

type Site = { id: string; name: string; slug: string; published: boolean; created_at: string };

function Sites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sites")
      .select("id,name,slug,published,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSites(data ?? []));
  }, [user]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "site";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("sites")
      .insert({ name: name.trim(), slug, owner_id: user.id })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("site_files").insert(starterFiles(name.trim()).map((f) => ({ ...f, site_id: data.id })));
    navigate({ to: "/sites/$siteId", params: { siteId: data.id } });
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-3xl font-semibold">Sites</h1>
      <p className="mt-1 text-muted-foreground">Each site is a repository of files you can deploy.</p>
      <form onSubmit={create} className="mt-8 flex gap-2">
        <Input placeholder="New site name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit"><Plus className="mr-1 h-4 w-4" />Create</Button>
      </form>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {sites.map((s) => (
          <Link
            key={s.id}
            to="/sites/$siteId"
            params={{ siteId: s.id }}
            className="rounded-xl border bg-card p-5 shadow-soft transition hover:border-primary"
          >
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-primary" />
              <span className="font-semibold">{s.name}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {s.published ? <span className="text-success">Live at /s/{s.slug}</span> : "Not deployed"}
            </div>
          </Link>
        ))}
        {sites.length === 0 && <p className="text-sm text-muted-foreground">No sites yet — create your first one above.</p>}
      </div>
    </div>
  );
}
