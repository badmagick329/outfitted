import { describe, expect, it } from "vitest";
import { formatDiscordNotification, maskEmail } from "./message";
import type { NotificationRecipient } from "./contracts";

const createdAt = new Date("2026-09-21T10:15:00.000Z");
const firstGarmentAt = new Date("2026-09-22T08:30:00.000Z");

const member: NotificationRecipient = {
  name: "Jane Doe",
  email: "jane.doe@example.com",
  createdAt,
  firstGarmentAddedAt: firstGarmentAt,
};

describe("maskEmail", () => {
  it("keeps only the first local character and the domain", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("j***@example.com");
  });

  it("falls back to a redaction marker for malformed addresses", () => {
    expect(maskEmail("not-an-email")).toBe("***");
    expect(maskEmail("@example.com")).toBe("***");
  });
});

describe("formatDiscordNotification", () => {
  it("formats an account-created embed with masked email, access mode, and admin link", () => {
    const payload = formatDiscordNotification({
      event: "account_created",
      member,
      accessMode: "private",
      nextAuthUrl: "https://outfitted.example.com/",
      now: createdAt,
    });

    const [embed] = payload.embeds;
    expect(embed.title).toBe("New Outfitted account");
    expect(embed.timestamp).toBe(createdAt.toISOString());
    expect(embed.description).toBe(
      "[Review member access](https://outfitted.example.com/admin/users)",
    );
    expect(embed.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Member", value: "Jane Doe" }),
        expect.objectContaining({ name: "Email", value: "j***@example.com" }),
        expect.objectContaining({ name: "Access mode", value: "private" }),
        expect.objectContaining({ name: "When (UTC)", value: createdAt.toISOString() }),
      ]),
    );
  });

  it("formats a first-garment embed from the milestone time and omits access mode", () => {
    const payload = formatDiscordNotification({
      event: "first_garment_added",
      member,
      now: new Date(),
    });

    const [embed] = payload.embeds;
    expect(embed.title).toBe("First garment added");
    expect(embed.timestamp).toBe(firstGarmentAt.toISOString());
    expect(embed.description).toBeUndefined();
    expect(embed.fields.some((field) => field.name === "Access mode")).toBe(false);
  });

  it("falls back to the execution time when the milestone is unset", () => {
    const now = new Date("2026-09-23T00:00:00.000Z");
    const payload = formatDiscordNotification({
      event: "first_garment_added",
      member: { ...member, firstGarmentAddedAt: null },
      now,
    });

    expect(payload.embeds[0].timestamp).toBe(now.toISOString());
  });

  it("uses an unnamed fallback when the profile has no display name", () => {
    const payload = formatDiscordNotification({
      event: "account_created",
      member: { ...member, name: "   " },
      accessMode: "public",
      now: createdAt,
    });

    expect(payload.embeds[0].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Member", value: "Unnamed member" }),
      ]),
    );
  });

  it("never includes the full email or wardrobe data", () => {
    const serialized = JSON.stringify(
      formatDiscordNotification({
        event: "account_created",
        member,
        accessMode: "private",
        nextAuthUrl: "https://outfitted.example.com",
        now: createdAt,
      }),
    );

    expect(serialized).not.toContain("jane.doe@example.com");
    expect(serialized.toLowerCase()).not.toContain("garment");
    expect(serialized.toLowerCase()).not.toContain("token");
    expect(serialized.toLowerCase()).not.toContain("photo");
  });
});
