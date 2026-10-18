import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bundleSite } from "@/lib/site-bundle";

export const Route = createFileRoute("/s/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — built with Studio` },
      { name: "description", content: "A site deployed with Studio." },
      { property: "og:title", content: `${params.slug} — built with Studio` },
      { property: "og:description", content: "A site deployed with Studio." },
    ],
  }),
  component: PublicSite,
});

function PublicSite() {
  const { slug } = Route.useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: site } = await supabase.from("sites").select("id").eq("slug", slug).eq("published", true).maybeSingle();
      if (!site) return setMissing(true);
      const { data: files } = await supabase.from("site_files").select("path,content").eq("site_id", site.id);
      setHtml(bundleSite(files ?? []));
    })();
  }, [slug]);

  if (missing) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">This site isn't deployed.</div>;
  if (html == null) return null;
  return <iframe title={slug} sandbox="allow-scripts allow-modals allow-forms" srcDoc={html} className="fixed inset-0 h-full w-full border-0" />;
}
