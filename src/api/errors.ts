import { isAxiosError } from "axios";

/** What went wrong, in terms the UI can act on. */
export type ApiErrorKind =
  | "network" // no response: offline, DNS, CORS, or the free host is still waking up
  | "unauthenticated" // 401: not logged in, wrong credentials or expired token
  | "email_unverified" // 403: customer must verify their email first
  | "two_factor_setup_required" // 403: staff must finish 2FA setup
  | "forbidden" // 403: other
  | "not_found" // 404 (also another customer's records)
  | "conflict" // 409
  | "validation" // 422
  | "rate_limited" // 429
  | "server" // 5xx
  | "unexpected"; // any other status

const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";
const NETWORK_MESSAGE = "Can't reach the Bookly server. Check your connection and try again.";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** Field → messages from a 422 response, e.g. { email: ["The email has already been taken."] }. */
  readonly fieldErrors: Record<string, string[]>;
  /** Seconds to wait after a 429. */
  readonly retryAfter: number | null;
  /** X-Request-Id of the failed request; show it so support can find the log lines. */
  readonly requestId: string | null;
  /** The response body, for the few answers that carry more than a message (e.g. Facebook's `needs: "phone"`). */
  readonly data: Record<string, unknown>;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    fieldErrors?: Record<string, string[]>;
    retryAfter?: number | null;
    requestId?: string | null;
    data?: Record<string, unknown>;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryAfter = init.retryAfter ?? null;
    this.requestId = init.requestId ?? null;
    this.data = init.data ?? {};
  }

  /** First message for a field, for showing under a form input. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (!isAxiosError(error)) {
      // Not an HTTP failure (a bug in our code): never show its technical text.
      return new ApiError({ kind: "unexpected", message: SERVER_MESSAGE });
    }

    const response = error.response;
    if (!response) return new ApiError({ kind: "network", message: NETWORK_MESSAGE });

    const status = response.status;
    const body = (typeof response.data === "object" && response.data !== null ? response.data : {}) as {
      message?: string;
      errors?: Record<string, string[]>;
      two_factor_setup_required?: boolean;
    };
    const header = (name: string): string | null => {
      const value = response.headers?.[name];
      return typeof value === "string" ? value : null;
    };
    const requestId = header("x-request-id");
    // The API's own messages are written for customers; axios's ("Request failed with status code 400") aren't.
    const message = body.message || SERVER_MESSAGE;

    // 503 with a real message is a temporary, explained problem (e.g. "We couldn't send the email just now…").
    if (status === 503 && body.message && body.message !== "Service Unavailable") {
      return new ApiError({ kind: "server", status, message: body.message, requestId });
    }
    if (status >= 500) return new ApiError({ kind: "server", status, message: SERVER_MESSAGE, requestId });
    if (status === 401) return new ApiError({ kind: "unauthenticated", status, message, requestId });
    if (status === 403) {
      const kind: ApiErrorKind = body.two_factor_setup_required
        ? "two_factor_setup_required"
        : /verify your (email|account)/i.test(message)
          ? "email_unverified"
          : "forbidden";
      return new ApiError({ kind, status, message, requestId });
    }
    if (status === 404) return new ApiError({ kind: "not_found", status, message: "We couldn't find that.", requestId });
    if (status === 409) return new ApiError({ kind: "conflict", status, message, requestId });
    if (status === 422) return new ApiError({ kind: "validation", status, message, fieldErrors: body.errors ?? {}, requestId, data: body as Record<string, unknown> });
    if (status === 429) {
      const retryAfter = Number(header("retry-after")) || null;
      return new ApiError({
        kind: "rate_limited",
        status,
        message: retryAfter ? `Too many attempts. Please wait ${retryAfter} seconds and try again.` : "Too many attempts. Please wait a moment and try again.",
        retryAfter,
        requestId,
      });
    }

    return new ApiError({ kind: "unexpected", status, message, requestId });
  }
}

/** Message to show for any thrown value. */
export const errorMessage = (error: unknown): string => ApiError.from(error).message;
