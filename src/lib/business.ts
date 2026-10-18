// Shared types + small helpers for the business portal system.

export type Business = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  welcome_text: string;
  published: boolean;
  created_at: string;
};

export type BusinessMember = {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type BusinessLink = {
  id: string;
  business_id: string;
  label: string;
  url: string;
  sort_order: number;
};

/** Turn a business name into a URL-safe slug. */
export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "business"
  );
}

/** A unique slug with a short random suffix to avoid collisions. */
export function uniqueSlug(name: string): string {
  return `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
}
