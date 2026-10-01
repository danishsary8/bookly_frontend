import { motion, useReducedMotion, type Transition, type Easing } from 'motion/react';
import { useEffect, useRef, useState, useMemo } from 'react';

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: Easing | Easing[];
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: 'p' | 'span' | 'div';
};

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach(k => {
    keyframes[k] = [from[k], ...steps.map(s => s[k])];
  });
  return keyframes;
};

// A token made only of punctuation ("," "—" "!" "…" or a stray quote) must never animate or
// wrap on its own: it's glued to the word before it (or the word after, when it leads).
const PUNCTUATION_ONLY = /^[\p{P}\p{S}]+$/u;

const tokenize = (text: string): string[] => {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  const words: string[] = [];
  let leading = '';

  raw.forEach(token => {
    if (PUNCTUATION_ONLY.test(token)) {
      if (words.length) {
        words[words.length - 1] += `\u00A0${token}`;
      } else {
        leading += `${token}\u00A0`;
      }
      return;
    }
    words.push(leading + token);
    leading = '';
  });

  if (leading) words.push(leading.trimEnd());
  return words;
};

const BlurText: React.FC<BlurTextProps> = ({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing = (t: number) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  as: Tag = 'p'
}) => {
  const words = useMemo(() => tokenize(text), [text]);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current || reduceMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin, reduceMotion]);

  const defaultFrom = useMemo(
    () =>
      direction === 'top' ? { filter: 'blur(10px)', opacity: 0, y: -50 } : { filter: 'blur(10px)', opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: 'blur(5px)',
        opacity: 0.5,
        y: direction === 'top' ? 5 : -5
      },
      { filter: 'blur(0px)', opacity: 1, y: 0 }
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const animateKeyframes = useMemo(() => buildKeyframes(fromSnapshot, toSnapshots), [fromSnapshot, toSnapshots]);

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)));

  // Reduced motion: static text, no blur, no movement.
  if (reduceMotion) {
    return (
      <Tag ref={ref as React.RefObject<HTMLParagraphElement & HTMLSpanElement & HTMLDivElement>} className={`blur-text ${className}`}>
        {text}
      </Tag>
    );
  }

  // Flatten to animated units while remembering which word each belongs to, so the stagger
  // index stays continuous across words in letter mode.
  let unitIndex = 0;
  const totalUnits = animateBy === 'words' ? words.length : words.reduce((n, w) => n + Array.from(w).length, 0);

  const renderUnit = (segment: string, key: string) => {
    const index = unitIndex++;
    const spanTransition: Transition = {
      duration: totalDuration,
      times,
      delay: (index * delay) / 1000,
      ease: easing
    };

    return (
      <motion.span
        key={key}
        initial={fromSnapshot}
        animate={inView ? animateKeyframes : fromSnapshot}
        transition={spanTransition}
        onAnimationComplete={index === totalUnits - 1 ? onAnimationComplete : undefined}
        style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
      >
        {segment}
      </motion.span>
    );
  };

  return (
    <Tag ref={ref as React.RefObject<HTMLParagraphElement & HTMLSpanElement & HTMLDivElement>} className={`blur-text ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          <span key={`w-${wordIndex}`}>
            {/* Each word is an unbreakable unit; line breaks only happen at the real spaces between words. */}
            <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {animateBy === 'words'
                ? renderUnit(word, `u-${wordIndex}`)
                : Array.from(word).map((letter, letterIndex) =>
                    renderUnit(letter === ' ' ? '\u00A0' : letter, `u-${wordIndex}-${letterIndex}`)
                  )}
            </span>
            {wordIndex < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    </Tag>
  );
};

export default BlurText;
