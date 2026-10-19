import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/t/$slug")({
  head: () => ({
    meta: [
      { title: "Team sign-in — Studio" },
      { name: "description", content: "Sign in to your team's hub on Studio." },
      { property: "og:title", content: "Team sign-in — Studio" },
      { property: "og:description", content: "Sign in to your team's hub on Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portal,
});

function Portal() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<{ name: string; tagline: string } | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("teams").select("name,tagline").eq("slug", slug).maybeSingle().then(({ data }) => setTeam(data));
  }, [slug]);

  useEffect(() => {
    if (user) navigate({ to: "/teams/$slug", params: { slug } });
  }, [user, slug, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/t/${slug}` });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  if (team === null) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-center"><div><h1 className="text-2xl font-semibold">This sign-in link isn't valid</h1><p className="mt-2 text-muted-foreground">Ask your admin for a new link.</p></div></div>;
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-end bg-rail p-12 text-rail-foreground md:flex">
        <p className="text-sm font-medium text-primary">Team portal</p>
        <h2 className="mt-2 text-5xl font-semibold leading-tight">{team?.name ?? "…"}</h2>
        <p className="mt-3 max-w-sm text-muted-foreground">{team?.tagline || "Chat, designs and sites for your team."}</p>
      </div>
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="font-display text-lg font-semibold">studio<span className="text-primary">.</span></p>
          <h1 className="mt-6 text-3xl font-semibold">Sign in to {team?.name ?? "your team"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use the email and password your admin gave you.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button className="w-full" disabled={busy}>Sign in</Button>
          </form>
          <Button variant="outline" className="mt-3 w-full" onClick={google}>Continue with Google</Button>
        </div>
      </div>
    </div>
  );
}
