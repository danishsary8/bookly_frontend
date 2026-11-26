/*
 * The shop's fonts, served from our own site (no Google Fonts request, so the first paint doesn't wait on another
 * server). Every file is font-display: swap and limited by unicode-range, so a browser only downloads the pieces
 * a page actually shows. Kantumruy Pro only covers Khmer letters (Latin text uses Hanken Grotesk and Fraunces).
 */
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
// Headings (owner 2026-11-26): Fraunces, variable weight + optical size, in place of Gloock.
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource/noto-serif-khmer/khmer-600.css";
import "@fontsource/kantumruy-pro/khmer-400.css";
import "@fontsource/kantumruy-pro/khmer-600.css";
