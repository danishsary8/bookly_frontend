/*
 * The shop's fonts, served from our own site (no Google Fonts request, so the first paint doesn't wait on another
 * server). Every file is font-display: swap and limited by unicode-range, so a browser only downloads the pieces
 * a page actually shows. Kantumruy Pro only covers Khmer letters (Latin text uses Hanken Grotesk and Newsreader).
 */
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
// Headings: Newsreader (variable weight + optical size, font preview 2026-11-11). Gloock stays only for the splash.
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource/gloock/400.css";
import "@fontsource/kantumruy-pro/khmer-400.css";
import "@fontsource/kantumruy-pro/khmer-600.css";
