import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Hash, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (s: Record<string, unknown>): { channel?: string } =>
    typeof s["channel"] === "string" ? { channel: s["channel"] } : {},
  head: () => ({
    meta: [
      { title: "Chat — Studio" },
      { name: "description", content: "Team channels in Studio." },
      { property: "og:title", content: "Chat — Studio" },
      { property: "og:description", content: "Team channels in Studio." },
    ],
  }),
  component: Chat,
});

type Channel = { id: string; name: string; team_id: string | null; teams: { name: string } | null };
type Message = { id: string; body: string; created_at: string; user_id: string; channel_id: string };

function Chat() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<string | null>(search.channel ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  async function loadChannels() {
    const { data } = await supabase.from("channels").select("id,name,team_id,teams(name)").order("created_at");
    setChannels((data as Channel[]) ?? []);
    if (!active && data?.length) setActive(data[0]!.id);
  }

  useEffect(() => {
    loadChannels();
    supabase.from("profiles").select("id,display_name").then(({ data }) => {
      setNames(Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name])));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    supabase
      .from("messages")
      .select("*")
      .eq("channel_id", active)
      .order("created_at")
      .limit(200)
      .then(({ data }) => setMessages(data ?? []));
    const ch = supabase
      .channel(`messages-${active}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${active}` },
        async (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          setNames((n) => {
            if (!n[m.user_id]) {
              supabase.from("profiles").select("id,display_name").eq("id", m.user_id).single().then(({ data }) => {
                if (data) setNames((o) => ({ ...o, [data.id]: data.display_name }));
              });
            }
            return n;
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [active]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active || !user) return;
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ body, channel_id: active, user_id: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  }

  async function newChannel() {
    const name = prompt("Channel name")?.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || !user) return;
    const teamId = channels.find((c) => c.id === active)?.team_id ?? null;
    const { data, error } = await supabase.from("channels").insert({ name, created_by: user.id, team_id: teamId }).select().single();
    if (error) { toast.error(error.message); return; }
    await loadChannels();
    setActive(data.id);
  }

  const current = channels.find((c) => c.id === active);
  const groups = channels.reduce<Record<string, Channel[]>>((acc, c) => {
    const k = c.teams?.name ?? "Everyone";
    (acc[k] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="flex h-full">
      <div className="w-60 overflow-y-auto border-r bg-card p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className="text-sm font-semibold">Channels</h2>
          <button onClick={newChannel} className="rounded p-1 hover:bg-secondary" title="New channel">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {Object.entries(groups).map(([g, list]) => (
          <div key={g} className="mb-3">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
                  c.id === active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Hash className="h-3.5 w-3.5" /> {c.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b px-6 py-4">
          <h1 className="flex items-center gap-1 text-lg font-semibold"><Hash className="h-4 w-4 text-muted-foreground" />{current?.name}</h1>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>}
          {messages.map((m) => {
            const name = names[m.user_id] ?? "Member";
            return (
              <div key={m.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-4">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${current?.name ?? ""}`} />
          <Button size="icon" type="submit"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
