import { z, ZodType } from "zod";
import { USER_COLORS } from "../../ColorPicker";

export const zLeafletAwarenessSchema = z.object({
  username: z.string().max(50),
  tool: z.enum(["MOVE", "DRAW"]).default("MOVE"),
  userColor: z
    .string()
    .max(20)
    .refine((str) => str in USER_COLORS) as ZodType<
    string & keyof typeof USER_COLORS
  >,
  mouseLatLng: z.tuple([z.number(), z.number()]),
  mousePressed: z.boolean(),
});

export type MultiplayerLeafletAwareness =
  typeof zLeafletAwarenessSchema["_output"];
