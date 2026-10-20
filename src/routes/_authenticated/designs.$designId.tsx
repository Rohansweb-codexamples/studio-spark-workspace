import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Circle, Save, Square, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/designs/$designId")({
  head: () => ({
    meta: [
      { title: "Design canvas — Studio" },
      { name: "description", content: "Edit a design board." },
      { property: "og:title", content: "Design canvas — Studio" },
      { property: "og:description", content: "Edit a design board." },
    ],
  }),
  component: Canvas,
});

type Shape = { id: string; kind: "rect" | "ellipse" | "text"; x: number; y: number; w: number; h: number; fill: string; text?: string | undefined };
const swatches = ["#e8603c", "#1f2937", "#f5c84b", "#4c8bf5", "#3fa37a", "#ffffff"];

function Canvas() {
  const { designId } = Route.useParams();
  const [name, setName] = useState("");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; resize: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    supabase.from("designs").select("name,data").eq("id", designId).single().then(({ data }) => {
      if (!data) return;
      setName(data.name);
      setShapes((data.data as Shape[]) ?? []);
    });
  }, [designId]);

  function add(kind: Shape["kind"]) {
    const s: Shape = { id: crypto.randomUUID(), kind, x: 80 + shapes.length * 12, y: 80 + shapes.length * 12, w: kind === "text" ? 200 : 160, h: kind === "text" ? 40 : 110, fill: kind === "text" ? "#1f2937" : swatches[0]!, text: kind === "text" ? "Double-click to edit" : undefined };
    setShapes([...shapes, s]);
    setSel(s.id);
  }

  function point(e: React.PointerEvent) {
    const r = svg.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: React.PointerEvent, s: Shape, resize = false) {
    e.stopPropagation();
    setSel(s.id);
    const p = point(e);
    drag.current = { id: s.id, dx: resize ? p.x - s.w : p.x - s.x, dy: resize ? p.y - s.h : p.y - s.y, resize };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    setShapes((all) => all.map((s) => s.id !== d.id ? s : d.resize
      ? { ...s, w: Math.max(20, p.x - d.dx), h: Math.max(20, p.y - d.dy) }
      : { ...s, x: p.x - d.dx, y: p.y - d.dy }));
  }

  const update = (patch: Partial<Shape>) => setShapes((all) => all.map((s) => (s.id === sel ? { ...s, ...patch } : s)));

  async function save() {
    const { error } = await supabase.from("designs").update({ name: name || "Untitled design", data: shapes, updated_at: new Date().toISOString() }).eq("id", designId);
    if (error) toast.error(error.message); else toast.success("Design saved");
  }

  const current = shapes.find((s) => s.id === sel);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Link to="/designs" className="rounded p-1.5 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></Link>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-48" />
        <div className="mx-2 flex gap-1">
          <Button size="sm" variant="outline" onClick={() => add("rect")}><Square className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => add("ellipse")}><Circle className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => add("text")}><Type className="h-4 w-4" /></Button>
        </div>
        {current && (
          <div className="flex items-center gap-1">
            {swatches.map((c) => (
              <button key={c} onClick={() => update({ fill: c })} className="h-6 w-6 rounded-full border" style={{ background: c }} aria-label={`Colour ${c}`} />
            ))}
            <Button size="sm" variant="ghost" onClick={() => { setShapes(shapes.filter((s) => s.id !== sel)); setSel(null); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
        <Button size="sm" className="ml-auto" onClick={save}><Save className="mr-1 h-4 w-4" />Save</Button>
      </header>
      <div className="flex-1 overflow-hidden bg-secondary/40">
        <svg ref={svg} className="h-full w-full" onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerDown={() => setSel(null)}
          style={{ backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.25) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          {shapes.map((s) => (
            <g key={s.id} onPointerDown={(e) => down(e, s)} className="cursor-move"
              onDoubleClick={() => { if (s.kind === "text") { const t = prompt("Text", s.text); if (t !== null) setShapes((all) => all.map((x) => x.id === s.id ? { ...x, text: t } : x)); } }}>
              {s.kind === "rect" && <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={10} fill={s.fill} />}
              {s.kind === "ellipse" && <ellipse cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} fill={s.fill} />}
              {s.kind === "text" && <text x={s.x} y={s.y + s.h * 0.7} fontSize={s.h * 0.6} fill={s.fill} style={{ userSelect: "none" }}>{s.text}</text>}
              {sel === s.id && (
                <>
                  <rect x={s.x - 3} y={s.y - 3} width={s.w + 6} height={s.h + 6} fill="none" stroke="#4c8bf5" strokeDasharray="4 3" pointerEvents="none" />
                  <rect x={s.x + s.w - 5} y={s.y + s.h - 5} width={10} height={10} fill="#4c8bf5" className="cursor-nwse-resize" onPointerDown={(e) => down(e, s, true)} />
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
