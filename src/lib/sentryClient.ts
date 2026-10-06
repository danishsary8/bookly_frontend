// The only Sentry functions the app uses, in one small lazily loaded chunk (importing the whole
// package as a namespace would keep replay, feedback and the rest from being tree-shaken).
export { captureException, init, withScope } from "@sentry/react";
