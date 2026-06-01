import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

// Convert "shopping-basket" → "ShoppingBasket"
function toPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const key = toPascal(name || "");
  const Comp = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[key] ?? Icons.Tag;
  return <Comp {...props} />;
}
