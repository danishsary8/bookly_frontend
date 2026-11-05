import { expect, it, vi, afterEach } from "vitest";
import { http } from "../client";
import { conditionalSupport } from "./support";
afterEach(() => vi.restoreAllMocks());
it("reuses the caller's exact cached result on 304 and sends its ETag", async () => {
  const previous = { value: { data: [1] }, etag: '"version"' };
  const get = vi.spyOn(http, "get").mockResolvedValue({ status: 304, headers: {}, data: "" });
  expect(await conditionalSupport("/support/conversations", previous)).toBe(previous);
  expect(get).toHaveBeenCalledWith("/support/conversations", expect.objectContaining({ headers: { "If-None-Match": '"version"' } }));
});
