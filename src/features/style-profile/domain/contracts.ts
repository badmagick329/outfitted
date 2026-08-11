import { z } from "zod";

const optionalStyleNote = z.string().trim().max(2000);

export const styleProfileInputSchema = z.object({
  generalStyle: optionalStyleNote,
  preferences: optionalStyleNote,
  avoidances: optionalStyleNote,
  occasionNotes: optionalStyleNote,
});

export type StyleProfileInput = z.infer<typeof styleProfileInputSchema>;
export type StyleProfile = StyleProfileInput;

export const emptyStyleProfile: StyleProfile = {
  generalStyle: "",
  preferences: "",
  avoidances: "",
  occasionNotes: "",
};

export function hasStyleProfileContent(profile: StyleProfile) {
  return Object.values(profile).some(Boolean);
}
