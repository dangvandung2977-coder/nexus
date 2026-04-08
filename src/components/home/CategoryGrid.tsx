"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Category } from "@/types";

const defaultCategories = [
  { id: "1", name: "Mods", slug: "mods", icon: "⚙️", color: "#6366f1", description: "Game modifications", sort_order: 1, created_at: "" },
  { id: "2", name: "Plugins", slug: "plugins", icon: "🔌", color: "#8b5cf6", description: "Server plugins", sort_order: 2, created_at: "" },
  { id: "3", name: "Resource Packs", slug: "resource-packs", icon: "🎨", color: "#ec4899", description: "Textures & assets", sort_order: 3, created_at: "" },
  { id: "4", name: "Scripts", slug: "scripts", icon: "📜", color: "#f59e0b", description: "Automation scripts", sort_order: 4, created_at: "" },
  { id: "5", name: "Templates", slug: "templates", icon: "📐", color: "#10b981", description: "Project templates", sort_order: 5, created_at: "" },
  { id: "6", name: "Asset Packs", slug: "asset-packs", icon: "🗂️", color: "#06b6d4", description: "Collections of assets", sort_order: 6, created_at: "" },
  { id: "7", name: "Maps", slug: "maps", icon: "🗺️", color: "#f97316", description: "World maps", sort_order: 7, created_at: "" },
  { id: "8", name: "Other", slug: "other", icon: "📦", color: "#64748b", description: "Everything else", sort_order: 8, created_at: "" },
];

interface CategoryGridProps {
  categories?: Category[];
}

export function CategoryGrid({ categories = defaultCategories }: CategoryGridProps) {
  const cats = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Browse Categories</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Find exactly what you&apos;re looking for
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {cats.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              href={`/explore?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 text-center group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                {cat.icon}
              </div>
              <span className="text-xs font-medium leading-tight">{cat.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
