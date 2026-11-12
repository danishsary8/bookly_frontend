import type { BrowserContext } from "@playwright/test";

/*
 * Keep end-to-end runs independent of other websites. Demo book covers come from an outside image host
 * (picsum.photos); when it is slow or rate-limits CI after many page loads, a page never goes "networkidle"
 * and a test waits until it times out. Any request that is not to the local app or API gets a tiny local
 * placeholder image (for images) or is aborted (anything else).
 */
const PLACEHOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#14207A"/></svg>';

export async function stayOffline(context: BrowserContext) {
  await context.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)(:\d+)?\/)/, (route) =>
    route.request().resourceType() === "image"
      ? route.fulfill({ status: 200, contentType: "image/svg+xml", body: PLACEHOLDER })
      : route.abort(),
  );
}
