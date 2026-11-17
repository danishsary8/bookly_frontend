/**
 * Pages that share one frame (the account area, owner 2026-11-17) count as one page here: moving between them keeps
 * the frame (its sidebar) in place and only the content inside changes, without a page fade or a jump to the top.
 */
export const frameOf = (pathname: string) => (pathname === "/account" || pathname.startsWith("/account/") ? "/account" : pathname);
