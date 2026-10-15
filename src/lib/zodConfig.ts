import { z } from "zod";

// Zod never builds validators with `new Function`: the Content-Security-Policy (vercel.json) allows no eval,
// and even Zod's caught probe for it would be reported as a violation.
z.config({ jitless: true });
