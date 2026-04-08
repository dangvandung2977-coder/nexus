export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Nexus Market";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const APP_DESCRIPTION =
  "The creator marketplace for game resources, mods, plugins, and digital tools.";

// Translation configuration
export const TRANSLATION_CONFIG = {
  CREDIT_RATE: parseFloat(process.env.TRANSLATION_CREDIT_RATE ?? "0.01"), // 100 lines = 1 credit
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LINES_PER_CHUNK: 50,
  DEFAULT_TARGET_LANGUAGE: "vi",
  ALLOWED_EXTENSIONS: ['.yml', '.yaml', '.json', '.lang', '.properties'],
} as const;

export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  BANNERS: "banners",
  COVERS: "covers",
  SCREENSHOTS: "screenshots",
  FILES: "listing-files",
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_GALLERY_IMAGES = 8;
export const MAX_FILES_PER_LISTING = 10;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const ALLOWED_FILE_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/java-archive",
  "application/octet-stream",
  "application/x-tar",
  "application/gzip",
  "text/plain",
  "application/json",
];

export const LISTING_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "most_downloaded", label: "Most Downloaded" },
  { value: "top_rated", label: "Top Rated" },
  { value: "oldest", label: "Oldest" },
] as const;

export const SUPPORTED_PLATFORMS = [
  "Minecraft Java",
  "Minecraft Bedrock",
  "Paper",
  "Spigot",
  "Bukkit",
  "Fabric",
  "Forge",
  "NeoForge",
  "Quilt",
  "Velocity",
  "BungeeCord",
  "Waterfall",
  "Generic / Other",
] as const;

export const ITEMS_PER_PAGE = 20;
export const DASHBOARD_ITEMS_PER_PAGE = 10;
