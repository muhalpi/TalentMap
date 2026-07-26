import { z } from "zod";

export const dashboardTokenRequestSchema = z
  .object({
    testKey: z.enum(["mbti", "bfi", "disc"]),
    participantId: z.string().uuid().optional(),
    participant_id: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.participantId ?? value.participant_id), {
    message: "Select a participant before creating assessment access.",
    path: ["participantId"],
  });
