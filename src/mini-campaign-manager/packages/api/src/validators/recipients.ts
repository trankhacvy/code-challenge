import { z } from "zod";

export const createRecipientSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().max(255).optional(),
});
