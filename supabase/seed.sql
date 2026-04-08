-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — SEED DATA
-- Run AFTER schema.sql and rls.sql
-- ═══════════════════════════════════════════════════════

-- Categories
insert into public.categories (name, slug, description, icon, color, sort_order) values
  ('Mods',          'mods',           'Game modifications and addons',      '⚙️',  '#6366f1', 1),
  ('Plugins',       'plugins',        'Server plugins and extensions',       '🔌', '#8b5cf6', 2),
  ('Resource Packs','resource-packs', 'Texture and resource packs',          '🎨', '#ec4899', 3),
  ('Scripts',       'scripts',        'Automation and utility scripts',      '📜', '#f59e0b', 4),
  ('Templates',     'templates',      'Project and world templates',         '📐', '#10b981', 5),
  ('Asset Packs',   'asset-packs',    'Collections of digital assets',       '🗂️', '#06b6d4', 6),
  ('Maps',          'maps',           'Custom maps and worlds',              '🗺️', '#f97316', 7),
  ('Other',         'other',          'Other digital resources',             '📦', '#64748b', 8)
on conflict (slug) do nothing;

-- Platforms
insert into public.platforms (name, slug) values
  ('Minecraft Java',    'minecraft-java'),
  ('Minecraft Bedrock', 'minecraft-bedrock'),
  ('Paper',             'paper'),
  ('Spigot',            'spigot'),
  ('Bukkit',            'bukkit'),
  ('Fabric',            'fabric'),
  ('Forge',             'forge'),
  ('NeoForge',          'neoforge'),
  ('Quilt',             'quilt'),
  ('Velocity',          'velocity'),
  ('BungeeCord',        'bungeecord'),
  ('Waterfall',         'waterfall'),
  ('Generic / Other',   'generic')
on conflict (slug) do nothing;
