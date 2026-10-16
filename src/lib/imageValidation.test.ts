import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateImageFile,
  validateImageUrl,
  MAX_IMAGE_SIZE_BYTES,
  MIN_IMAGE_DIMENSION,
  MAX_IMAGE_DIMENSION,
} from "./imageValidation";

describe("validateImageUrl", () => {
  it("allows empty string (optional fields)", () => {
    expect(validateImageUrl("")).toEqual({ ok: true });
    expect(validateImageUrl("   ")).toEqual({ ok: true });
  });

  it("accepts valid http and https image URLs", () => {
    expect(validateImageUrl("https://example.com/cover.jpg")).toEqual({ ok: true });
    expect(validateImageUrl("https://example.com/cover.jpeg")).toEqual({ ok: true });
    expect(validateImageUrl("https://example.com/cover.png")).toEqual({ ok: true });
    expect(validateImageUrl("https://example.com/cover.webp")).toEqual({ ok: true });
    expect(validateImageUrl("http://example.com/images/book_123.PNG")).toEqual({ ok: true });
  });

  it("rejects non-http(s) protocols", () => {
    const res = validateImageUrl("ftp://example.com/cover.jpg");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("http:// or https://");
    }
  });

  it("rejects unsupported extensions", () => {
    const res = validateImageUrl("https://example.com/cover.gif");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain(".jpg, .jpeg, .png, or .webp");
    }
  });

  it("rejects invalid URLs", () => {
    const res = validateImageUrl("not-a-url");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("valid web URL");
    }
  });
});

describe("validateImageFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Stub URL.createObjectURL and revokeObjectURL
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    } else {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    }
  });

  it("rejects oversized files", async () => {
    const oversized = new File(["x".repeat(100)], "big.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: MAX_IMAGE_SIZE_BYTES + 1 });

    const result = await validateImageFile(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("5 MB limit");
    }
  });

  it("rejects unsupported file MIME type or extension", async () => {
    const file = new File(["test"], "doc.pdf", { type: "application/pdf" });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Only JPG, PNG, and WebP");
    }
  });

  it("validates dimensions within allowed bounds", async () => {
    class MockImage {
      naturalWidth = 600;
      naturalHeight = 900;
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(new Event("load")), 0);
      }
    }
    vi.stubGlobal("Image", MockImage);

    const file = new File(["dummy"], "cover.jpg", { type: "image/jpeg" });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(600);
      expect(result.height).toBe(900);
    }
    vi.unstubAllGlobals();
  });

  it("rejects dimensions below minimum threshold", async () => {
    class MockImage {
      naturalWidth = 80;
      naturalHeight = 80;
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(new Event("load")), 0);
      }
    }
    vi.stubGlobal("Image", MockImage);

    const file = new File(["dummy"], "tiny.png", { type: "image/png" });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(`Minimum is ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px`);
    }
    vi.unstubAllGlobals();
  });

  it("rejects dimensions above maximum threshold", async () => {
    class MockImage {
      naturalWidth = 4500;
      naturalHeight = 3000;
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(new Event("load")), 0);
      }
    }
    vi.stubGlobal("Image", MockImage);

    const file = new File(["dummy"], "huge.webp", { type: "image/webp" });
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(`Maximum is ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px`);
    }
    vi.unstubAllGlobals();
  });
});
