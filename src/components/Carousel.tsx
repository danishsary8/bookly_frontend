import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, type MotionValue, type PanInfo, type Transition, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import React, { type JSX } from 'react';
import { cn } from '@/lib/utils';

// replace icons with your own if needed
import { FiCircle, FiCode, FiFileText, FiLayers, FiLayout } from 'react-icons/fi';
export interface CarouselItem {
  title: string;
  description: string;
  id: number;
  icon: React.ReactNode;
}

export interface CarouselProps {
  items?: CarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
  /** Custom slide content. When provided, it is rendered instead of `items`. */
  slides?: React.ReactNode[];
  /** Controlled active slide index. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Fill the parent's width instead of using `baseWidth`. */
  fluid?: boolean;
  /** Maximum rotateY (degrees) of neighbouring slides as they turn away. */
  rotate?: number;
  showIndicators?: boolean;
  className?: string;
  itemClassName?: string;
}

const DEFAULT_ITEMS: CarouselItem[] = [
  {
    title: 'Text Animations',
    description: 'Cool text animations for your projects.',
    id: 1,
    icon: <FiFileText className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Animations',
    description: 'Smooth animations for your projects.',
    id: 2,
    icon: <FiCircle className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Components',
    description: 'Reusable components for your projects.',
    id: 3,
    icon: <FiLayers className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Backgrounds',
    description: 'Beautiful backgrounds and patterns for your projects.',
    id: 4,
    icon: <FiLayout className="h-[16px] w-[16px] text-white" />
  },
  {
    title: 'Common UI',
    description: 'Common UI components are coming soon!',
    id: 5,
    icon: <FiCode className="h-[16px] w-[16px] text-white" />
  }
];

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface CarouselItemProps {
  item?: CarouselItem;
  content?: React.ReactNode;
  index: number;
  itemWidth: number;
  round: boolean;
  trackItemOffset: number;
  x: MotionValue<number>;
  transition: Transition;
  className?: string;
  rotate: number;
}

function CarouselItem({ item, content, index, itemWidth, round, trackItemOffset, x, transition, className, rotate }: CarouselItemProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [rotate, 0, -rotate];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  if (content !== undefined) {
    return (
      <motion.div
        className={cn('relative shrink-0 overflow-hidden cursor-grab active:cursor-grabbing', className)}
        style={{ width: itemWidth, height: '100%', rotateY }}
        transition={transition}
      >
        {content}
      </motion.div>
    );
  }

  if (!item) return null;

  return (
    <motion.div
      key={`${item?.id ?? index}-${index}`}
      className={`relative shrink-0 flex flex-col ${
        round
          ? 'items-center justify-center text-center bg-[#120F17] border-0'
          : 'items-start justify-between bg-[#222] border border-[#222] rounded-[12px]'
      } overflow-hidden cursor-grab active:cursor-grabbing`}
      style={{
        width: itemWidth,
        height: round ? itemWidth : '100%',
        rotateY: rotateY,
        ...(round && { borderRadius: '50%' })
      }}
      transition={transition}
    >
      <div className={`${round ? 'p-0 m-0' : 'mb-4 p-5'}`}>
        <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#120F17]">
          {item.icon}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-1 font-black text-lg text-white">{item.title}</div>
        <p className="text-sm text-white">{item.description}</p>
      </div>
    </motion.div>
  );
}

export default function Carousel({
  items = DEFAULT_ITEMS,
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
  slides,
  index,
  onIndexChange,
  fluid = false,
  rotate = 90,
  showIndicators = true,
  className,
  itemClassName
}: CarouselProps): JSX.Element {
  const isControlled = typeof index === 'number';
  const count = slides ? slides.length : items.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(baseWidth);

  useLayoutEffect(() => {
    if (!fluid || !containerRef.current) return;
    const el = containerRef.current;
    const update = () => setMeasuredWidth(el.clientWidth || baseWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fluid, baseWidth]);

  const containerPadding = fluid ? 0 : 16;
  const width = fluid ? measuredWidth : baseWidth;
  const itemWidth = width - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;

  // Indices into the source list, with clones at both ends when looping.
  const renderIndices = useMemo(() => {
    const base = Array.from({ length: count }, (_, i) => i);
    if (!loop || count === 0) return base;
    return [count - 1, ...base, 0];
  }, [count, loop]);

  const indexRef = useRef(index ?? 0);
  useLayoutEffect(() => {
    indexRef.current = index ?? 0;
  }, [index]);

  const [position, setPosition] = useState<number>(loop ? (index ?? 0) + 1 : (index ?? 0));
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || renderIndices.length <= 1) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, renderIndices.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, renderIndices.length]);

  useEffect(() => {
    const startIndex = isControlled ? Math.min(indexRef.current, Math.max(count - 1, 0)) : 0;
    const startingPosition = loop ? startIndex + 1 : startIndex;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the slide set changes
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [count, loop, trackItemOffset, x, isControlled]);

  useEffect(() => {
    if (!loop && position > renderIndices.length - 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp after the slide list shrinks
      setPosition(Math.max(0, renderIndices.length - 1));
    }
  }, [renderIndices.length, loop, position]);

  // Follow the controlled index, wrapping through the clones so looping stays seamless.
  useEffect(() => {
    if (!isControlled || count === 0) return;
    const target = Math.min(Math.max(index, 0), count - 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the controlled index prop
    setPosition(prev => {
      const current = loop ? (prev - 1 + count) % count : prev;
      if (current === target) return prev;
      if (loop) {
        if (current === count - 1 && target === 0) return count + 1;
        if (current === 0 && target === count - 1 && count > 2) return 0;
        return target + 1;
      }
      return target;
    });
  }, [index, isControlled, count, loop]);

  const reduceMotion = useReducedMotion();
  const effectiveTransition = isJumping || reduceMotion ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    if (!loop || renderIndices.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = renderIndices.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = count;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = renderIndices.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(renderIndices.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    count === 0 ? 0 : loop ? (position - 1 + count) % count : Math.min(position, count - 1);

  // Report user-driven changes (drag, dots, autoplay) back to a controlling parent.
  const lastActiveIndex = useRef(activeIndex);
  useEffect(() => {
    if (activeIndex === lastActiveIndex.current) return;
    lastActiveIndex.current = activeIndex;
    if (activeIndex !== index) onIndexChange?.(activeIndex);
  }, [activeIndex, index, onIndexChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        fluid ? 'w-full' : 'p-4',
        round ? 'rounded-full border border-white' : 'rounded-[24px] border border-[#222]',
        className
      )}
      style={{
        ...(!fluid && { width: `${baseWidth}px` }),
        ...(round && { height: `${baseWidth}px` })
      }}
    >
      <motion.div
        className="flex h-full"
        drag={isAnimating ? false : 'x'}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
      >
        {renderIndices.map((sourceIndex, renderIndex) => (
          <CarouselItem
            key={`${slides ? sourceIndex : (items[sourceIndex]?.id ?? sourceIndex)}-${renderIndex}`}
            item={slides ? undefined : items[sourceIndex]}
            content={slides ? slides[sourceIndex] : undefined}
            index={renderIndex}
            itemWidth={itemWidth}
            round={round}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
            className={itemClassName}
            rotate={reduceMotion ? 0 : rotate}
          />
        ))}
      </motion.div>
      {showIndicators && (
        <div className={`flex w-full justify-center ${round ? 'absolute z-20 bottom-12 left-1/2 -translate-x-1/2' : ''}`}>
          <div className="mt-4 flex w-[150px] justify-between px-8">
            {Array.from({ length: count }, (_, dotIndex) => (
              <motion.button
                type="button"
                key={dotIndex}
                aria-label={`Go to slide ${dotIndex + 1}`}
                aria-current={activeIndex === dotIndex}
                className={`h-2 w-2 rounded-full cursor-pointer border-0 p-0 appearance-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  activeIndex === dotIndex
                    ? round
                      ? 'bg-white'
                      : 'bg-[#333333]'
                    : round
                      ? 'bg-[#555]'
                      : 'bg-[rgba(51,51,51,0.4)]'
                }`}
                animate={{
                  scale: activeIndex === dotIndex ? 1.2 : 1
                }}
                onClick={() => setPosition(loop ? dotIndex + 1 : dotIndex)}
                transition={{ duration: 0.15 }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
