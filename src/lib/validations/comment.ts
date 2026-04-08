import { z } from "zod";

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be 2000 characters or less"),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
