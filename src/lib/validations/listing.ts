import { z } from "zod";

export const createListingSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(80, "Title must be 80 characters or less"),
  short_description: z
    .string()
    .min(10, "Short description must be at least 10 characters")
    .max(200, "Short description must be 200 characters or less"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category_id: z.string().uuid("Please select a category").optional().nullable(),
  external_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  youtube_url: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  license: z.string().optional(),
  is_open_source: z.boolean().default(false),
  platforms: z.array(z.string()).default([]),
  supported_versions: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  price: z.coerce.number().min(0).default(0),
  currency: z.string().default("USD"),
  credit_cost: z.coerce.number().min(0).default(0),
  changelog: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const updateListingSchema = createListingSchema.partial();

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
