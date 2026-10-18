import { createFileRoute, Link } from "@tanstack/react-router";
import { MessagesSquare, FolderGit2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio — team chat & site builder" },
      { name: "description", content: "Chat with your team, keep site code in repositories, and deploy with one click." },
      { property: "og:title", content: "Studio — team chat & site builder" },
      { property: "og:description", content: "Chat with your team, keep site code in repositories, and deploy with one click." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: MessagesSquare, title: "Team chat", text: "Channels that update live for everyone." },
  { icon: FolderGit2, title: "Repositories", text: "Every site is a set of files you can edit in the browser." },
  { icon: Rocket, title: "Deploy", text: "Publish to a public link in one click." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold">studio<span className="text-primary">.</span></span>
        <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="mb-4 text-sm font-medium text-primary">Chat · Code · Deploy</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] md:text-7xl">
          Where your team talks, builds and ships.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          One calm workspace for conversations and the websites that come out of them.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg"><Link to="/auth">Get started</Link></Button>
        </div>
        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-soft">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
