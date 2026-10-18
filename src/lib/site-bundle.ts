export type SiteFile = { path: string; content: string };

/** Inline style.css / *.js files referenced from index.html so the site renders from one document. */
export function bundleSite(files: SiteFile[]): string {
  const map = new Map(files.map((f) => [f.path.replace(/^\.?\//, ""), f.content]));
  let html = map.get("index.html") ?? "<h1>No index.html yet</h1>";
  html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/g, (tag, href) => {
    const css = map.get(href.replace(/^\.?\//, ""));
    return css != null ? `<style>${css}</style>` : tag;
  });
  html = html.replace(/<script([^>]*)src=["']([^"']+\.js)["']([^>]*)><\/script>/g, (tag, a, src, b) => {
    const js = map.get(src.replace(/^\.?\//, ""));
    return js != null ? `<script${a}${b}>${js.replace(/<\/script/g, "<\\/script")}</script>` : tag;
  });
  return html;
}

export const starterFiles = (name: string): SiteFile[] => [
  {
    path: "index.html",
    content: `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>${name}</h1>
    <p>Edit these files and hit Deploy.</p>
    <button id="btn">Click me</button>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
  },
  {
    path: "style.css",
    content: `body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f7f6f2; }
main { text-align: center; }
button { padding: .6rem 1.2rem; border-radius: 8px; border: 0; background: #138a7a; color: white; cursor: pointer; }`,
  },
  { path: "script.js", content: `document.getElementById("btn").onclick = () => alert("Hello from your site!");` },
];
