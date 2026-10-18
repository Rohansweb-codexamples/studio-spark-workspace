import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileCode2, Plus, Rocket, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { bundleSite } from "@/lib/site-bundle";

export const Route = createFileRoute("/_authenticated/sites/$siteId")({
  head: () => ({
    meta: [
      { title: "Repository — Studio" },
      { name: "description", content: "Edit and deploy your site." },
      { property: "og:title", content: "Repository — Studio" },
      { property: "og:description", content: "Edit and deploy your site." },
    ],
  }),
  component: Repo,
});

type File = { id: string; path: string; content: string };
type Site = { id: string; name: string; slug: string; published: boolean; published_at: string | null };

function Repo() {
  const { siteId } = Route.useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("sites").select("id,name,slug,published,published_at").eq("id", siteId).single().then(({ data }) => setSite(data));
    supabase.from("site_files").select("id,path,content").eq("site_id", siteId).order("path").then(({ data }) => {
      setFiles(data ?? []);
      const idx = data?.find((f) => f.path === "index.html") ?? data?.[0];
      if (idx) setActiveId(idx.id);
    });
  }, [siteId]);

  const merged = useMemo(() => files.map((f) => ({ ...f, content: dirty[f.id] ?? f.content })), [files, dirty]);
  const active = merged.find((f) => f.id === activeId);
  const preview = useMemo(() => bundleSite(merged), [merged]);

  async function save() {
    const ids = Object.keys(dirty);
    for (const id of ids) {
      const { error } = await supabase.from("site_files").update({ content: dirty[id]!, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) { toast.error(error.message); return; }
    }
    setFiles(merged);
    setDirty({});
    if (ids.length) toast.success(`Saved ${ids.length} file${ids.length > 1 ? "s" : ""}`);
  }

  async function deploy() {
    await save();
    const { data, error } = await supabase
      .from("sites")
      .update({ published: true, published_at: new Date().toISOString() })
      .eq("id", siteId)
      .select("id,name,slug,published,published_at")
      .single();
    if (error) { toast.error(error.message); return; }
    setSite(data);
    toast.success("Deployed! Your site is live.");
  }

  async function addFile() {
    const path = prompt("File name (e.g. about.html, theme.css)")?.trim();
    if (!path) return;
    const { data, error } = await supabase.from("site_files").insert({ site_id: siteId, path, content: "" }).select("id,path,content").single();
    if (error) { toast.error(error.message); return; }
    setFiles((f) => [...f, data].sort((a, b) => a.path.localeCompare(b.path)));
    setActiveId(data.id);
  }

  async function removeFile(f: File) {
    if (!confirm(`Delete ${f.path}?`)) return;
    await supabase.from("site_files").delete().eq("id", f.id);
    setFiles((all) => all.filter((x) => x.id !== f.id));
    if (activeId === f.id) setActiveId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link to="/sites" className="rounded p-1 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="font-semibold">{site?.name}</h1>
        {site?.published && (
          <a href={`/s/${site.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-success hover:underline">
            /s/{site.slug} <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={save} disabled={!Object.keys(dirty).length}>
            <Save className="mr-1 h-4 w-4" />Save
          </Button>
          <Button size="sm" onClick={deploy}><Rocket className="mr-1 h-4 w-4" />Deploy</Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="w-52 border-r bg-card p-2">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Files</span>
            <button onClick={addFile} className="rounded p-1 hover:bg-secondary" title="New file"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {merged.map((f) => (
            <div
              key={f.id}
              className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs ${
                f.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
              }`}
            >
              <button className="flex flex-1 items-center gap-1.5 text-left" onClick={() => setActiveId(f.id)}>
                <FileCode2 className="h-3.5 w-3.5" />{f.path}{dirty[f.id] != null && <span className="text-primary">•</span>}
              </button>
              <button onClick={() => removeFile(f)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <textarea
          spellCheck={false}
          className="min-w-0 flex-1 resize-none bg-code p-4 font-mono text-sm leading-relaxed text-code-foreground outline-none"
          value={active?.content ?? ""}
          disabled={!active}
          onChange={(e) => active && setDirty((d) => ({ ...d, [active.id]: e.target.value }))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col border-l">
          <div className="border-b px-4 py-2 text-xs text-muted-foreground">Live preview</div>
          <iframe title="preview" sandbox="allow-scripts allow-modals" srcDoc={preview} className="flex-1 bg-card" />
        </div>
      </div>
    </div>
  );
}
