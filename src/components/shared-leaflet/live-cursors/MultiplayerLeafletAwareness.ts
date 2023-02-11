import { z } from "zod";
import { USER_COLORS } from "../../ColorPicker";

export const zLeafletAwarenessSchema = z.object({
  username: z.string().max(50),
  userColor: z
    .string()
    .max(20)
    .refine((str) => str in USER_COLORS),
  mouseLatLng: z.tuple([z.number(), z.number()]),
  mousePressed: z.boolean(),
});

export type MultiplayerLeafletAwareness =
  typeof zLeafletAwarenessSchema["_output"];
