import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Palette, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/designs/")({
  head: () => ({
    meta: [
      { title: "Designs — Studio" },
      { name: "description", content: "Design boards for your team." },
      { property: "og:title", content: "Designs — Studio" },
      { property: "og:description", content: "Design boards for your team." },
    ],
  }),
  component: Designs,
});

function Designs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<{ id: string; name: string; updated_at: string }[]>([]);

  useEffect(() => {
    supabase.from("designs").select("id,name,updated_at").order("updated_at", { ascending: false }).then(({ data }) => setDesigns(data ?? []));
  }, []);

  async function create() {
    if (!user) return;
    const { data, error } = await supabase.from("designs").insert({ owner_id: user.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/designs/$designId", params: { designId: data.id } });
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Designs</h1>
          <p className="mt-1 text-muted-foreground">Sketch layouts with shapes and text on a canvas.</p>
        </div>
        <Button onClick={create}><Plus className="mr-1 h-4 w-4" />New design</Button>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {designs.length === 0 && <p className="text-sm text-muted-foreground">No designs yet.</p>}
        {designs.map((d) => (
          <Link key={d.id} to="/designs/$designId" params={{ designId: d.id }} className="rounded-xl border bg-card p-5 shadow-soft hover:border-primary">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{d.name}</h3>
            <p className="text-xs text-muted-foreground">Edited {new Date(d.updated_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
