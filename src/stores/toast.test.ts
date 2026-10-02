import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_DURATION, MAX_TOASTS, dismissToast, getToasts, toast } from "./toast";

afterEach(() => dismissToast());

describe("toast store", () => {
  it("puts the newest toast first", () => {
    toast.success("Saved");
    toast.info({ title: "Heads up", description: "Something changed" });
    expect(getToasts().map((t) => t.title)).toEqual(["Heads up", "Saved"]);
  });

  it("keeps at most three", () => {
    for (let i = 1; i <= 5; i++) toast.info(`Toast ${i}`);
    expect(getToasts()).toHaveLength(MAX_TOASTS);
    expect(getToasts()[0].title).toBe("Toast 5");
  });

  it("auto-dismisses success and info, but errors persist", () => {
    toast.success("Added");
    toast.error("Failed");
    const [error, success] = getToasts();
    expect(success.duration).toBe(DEFAULT_DURATION);
    expect(error.duration).toBeNull();
  });

  it("dismisses one toast by id", () => {
    const keep = toast.info("Keep");
    const drop = toast.info("Drop");
    dismissToast(drop);
    expect(getToasts().map((t) => t.id)).toEqual([keep]);
  });
});
