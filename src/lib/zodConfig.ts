import { z } from "zod";

// Zod never builds validators with `new Function`: the Content-Security-Policy (vercel.json) allows no eval,
// and even Zod's caught probe for it would be reported as a violation.
z.config({ jitless: true });

/**
 * Import `z` from here, never from "zod": the setting above then always runs before any schema exists, and Zod
 * stays out of the first-load file (it loads with the forms that need it).
 */
export { z };
