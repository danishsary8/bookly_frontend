import { describe, expect, it } from "vitest";
import { addressSchema, passwordSchema, profileSchema } from "./schemas";

const address = { label: "", recipient_name: "Sok Dara", phone: "012 345 678", address_line1: "House 12, St 240", address_line2: "", city: "Phnom Penh", state: "", postal_code: "", country: "Cambodia", is_default: false };

describe("account schemas", () => {
  it("accepts a valid profile and rejects a bad phone", () => {
    expect(profileSchema.safeParse({ name: "Sok Dara", phone: "" }).success).toBe(true);
    expect(profileSchema.safeParse({ name: "Sok Dara", phone: "call me" }).success).toBe(false);
  });

  it("only requires the current password when the account has one", () => {
    const values = { current_password: "", password: "reading123", password_confirmation: "reading123" };
    expect(passwordSchema(true).safeParse(values).success).toBe(false);
    expect(passwordSchema(false).safeParse(values).success).toBe(true);
  });

  it("requires recipient, phone, street, city and country for an address", () => {
    expect(addressSchema.safeParse(address).success).toBe(true);
    const result = addressSchema.safeParse({ ...address, recipient_name: "", phone: "", address_line1: " ", city: "", country: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(["address_line1", "city", "country", "phone", "recipient_name"]);
  });

  it("enforces the API's length limits", () => {
    expect(addressSchema.safeParse({ ...address, label: "x".repeat(51) }).success).toBe(false);
    expect(addressSchema.safeParse({ ...address, postal_code: "1".repeat(21) }).success).toBe(false);
  });
});
