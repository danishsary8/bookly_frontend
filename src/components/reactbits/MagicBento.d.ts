import type { CSSProperties, MouseEvent, ReactNode } from "react";

/* Types for the React Bits MagicBento (JS-CSS variant, kept as published: reactbits.dev/components/magic-bento). */
export interface MagicBentoItem {
  id?: string | number;
  title?: string;
  description?: string;
  label?: ReactNode;
  icon?: ReactNode;
  visual?: string | ReactNode;
  /** Replaces the default header / visual / text layout. */
  content?: ReactNode;
  image?: string;
  href?: string;
  target?: string;
  rel?: string;
  colSpan?: number;
  rowSpan?: number;
  onClick?: (event: MouseEvent) => void;
}

export interface MagicBentoProps {
  items?: MagicBentoItem[];
  columns?: number;
  rowHeight?: number;
  gap?: number;
  radius?: number;
  theme?: "dark" | "light";
  glowColor?: string;
  textAutoHide?: boolean;
  enableBorderGlow?: boolean;
  enableSpotlight?: boolean;
  spotlightRadius?: number;
  enableStars?: boolean;
  particleCount?: number;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  intro?: boolean;
  disableAnimations?: boolean;
  onItemClick?: (item: MagicBentoItem, index: number) => void;
  className?: string;
  style?: CSSProperties;
}

declare const MagicBento: (props: MagicBentoProps) => ReactNode;
export default MagicBento;
