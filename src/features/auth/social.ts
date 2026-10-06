/*
 * Sign in with Google / Facebook. The provider's popup gives us an access token; the API checks the
 * token was issued to our app, reads the profile from the provider itself and signs the customer in
 * (POST /auth/social/{provider}). Each provider is off until its id is set:
 * VITE_GOOGLE_CLIENT_ID, VITE_FACEBOOK_APP_ID.
 *
 * Browsers only allow a popup straight from a click, so the provider's script is loaded when the
 * buttons appear (`prepare`) and the click opens the popup synchronously (`requestToken`).
 */

export type Provider = "google" | "facebook";

type GoogleTokenResponse = { access_token?: string; error?: string };
type GoogleTokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
type GoogleApi = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type: string }) => void;
      }) => GoogleTokenClient;
    };
  };
};
type FacebookLoginResponse = { status: string; authResponse?: { accessToken: string } | null };
type FacebookApi = {
  init: (options: { appId: string; version: string; cookie: boolean; xfbml: boolean }) => void;
  login: (callback: (response: FacebookLoginResponse) => void, options: { scope: string }) => void;
};
declare global {
  interface Window {
    google?: GoogleApi;
    FB?: FacebookApi;
    fbAsyncInit?: () => void;
  }
}

/** The customer closed the popup or said no: not an error worth a message. */
export class SocialCancelled extends Error {}

export const socialIds = () => ({
  google: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || "",
  facebook: (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined) || "",
});
export const socialEnabled = (provider: Provider) => socialIds()[provider] !== "";
export const anySocialEnabled = () => socialEnabled("google") || socialEnabled("facebook");

const SCRIPTS: Record<Provider, string> = {
  google: "https://accounts.google.com/gsi/client",
  facebook: "https://connect.facebook.net/en_US/sdk.js",
};
const FACEBOOK_VERSION = "v21.0";

const loading: Partial<Record<Provider, Promise<void>>> = {};

function loadScript(provider: Provider): Promise<void> {
  if (provider === "google" && window.google?.accounts) return Promise.resolve();
  if (provider === "facebook" && window.FB) return Promise.resolve();
  loading[provider] ??= new Promise<void>((resolve, reject) => {
    if (provider === "facebook") {
      window.fbAsyncInit = () => {
        window.FB!.init({ appId: socialIds().facebook, version: FACEBOOK_VERSION, cookie: false, xfbml: false });
        resolve();
      };
    }
    const script = document.createElement("script");
    script.src = SCRIPTS[provider];
    script.async = true;
    // Facebook's snippet asks for an anonymous CORS fetch. Google's script is served without CORS
    // headers, so asking for one makes the browser block it: load it as a plain script.
    if (provider === "facebook") script.crossOrigin = "anonymous";
    if (provider === "google") script.onload = () => resolve();
    script.onerror = () => {
      delete loading[provider];
      script.remove();
      reject(new Error(`${provider} could not load`));
    };
    document.head.appendChild(script);
  });
  return loading[provider];
}

/** Starts loading a provider's script so a later click can open its popup straight away. */
export function prepare(provider: Provider): Promise<void> {
  return socialEnabled(provider) ? loadScript(provider) : Promise.reject(new Error(`${provider} is not set up`));
}

export const isReady = (provider: Provider) => (provider === "google" ? Boolean(window.google?.accounts) : Boolean(window.FB));

/**
 * Opens the provider's popup and resolves with its access token. Call it directly from a click once
 * `prepare` has finished. Rejects with SocialCancelled when the customer closes it or declines.
 */
export function requestToken(provider: Provider): Promise<string> {
  return new Promise((resolve, reject) => {
    if (provider === "google") {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: socialIds().google,
        scope: "openid email profile",
        callback: (response) => (response.access_token ? resolve(response.access_token) : reject(new SocialCancelled(response.error ?? "cancelled"))),
        error_callback: (error) =>
          error.type === "popup_failed_to_open" ? reject(new Error("popup_blocked")) : reject(new SocialCancelled(error.type)),
      });
      client.requestAccessToken({ prompt: "" });
      return;
    }
    window.FB!.login(
      (response) => (response.authResponse?.accessToken ? resolve(response.authResponse.accessToken) : reject(new SocialCancelled(response.status))),
      { scope: "email,public_profile" },
    );
  });
}

/** For tests: forget loaded scripts. */
export function resetSocialForTests() {
  delete loading.google;
  delete loading.facebook;
}
