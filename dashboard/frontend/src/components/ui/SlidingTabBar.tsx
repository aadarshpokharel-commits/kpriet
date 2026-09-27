import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface IWorkspaceTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode | string;
  badge?: string | number;
}

interface SlidingTabBarProps {
  tabs: IWorkspaceTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
}

export const SlidingTabBar: React.FC<SlidingTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  ariaLabel = 'Workspace Tabs',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Drag-to-slide mouse/touch tracking
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const hasDragged = useRef(false);

  // Check scroll boundary limits
  const checkScrollLimits = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const currentScroll = el.scrollLeft;

    setCanScrollLeft(currentScroll > 6);
    setCanScrollRight(maxScroll - currentScroll > 6);

    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (currentScroll / maxScroll) * 100)));
    } else {
      setScrollProgress(0);
    }
  }, []);

  // Set up listeners on mount and updates
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScrollLimits();

    const handleScroll = () => {
      checkScrollLimits();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScrollLimits();
      });
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleScroll);
    };
  }, [tabs, checkScrollLimits]);

  // Auto-scroll active tab into view when activeTab changes
  useEffect(() => {
    const activeBtn = tabButtonRefs.current.get(activeTab);
    if (activeBtn && scrollRef.current) {
      const container = scrollRef.current;
      const btnRect = activeBtn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // If active tab is partially or completely outside the visible viewport
      if (btnRect.left < containerRect.left + 50 || btnRect.right > containerRect.right - 50) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
    const timer = setTimeout(checkScrollLimits, 250);
    return () => clearTimeout(timer);
  }, [activeTab, checkScrollLimits]);

  // Smooth slide function for left/right buttons
  const slide = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const slideAmount = Math.max(container.clientWidth * 0.5, 260);

    container.scrollBy({
      left: direction === 'left' ? -slideAmount : slideAmount,
      behavior: 'smooth',
    });
  };

  // Convert vertical mouse wheel into horizontal slide when hovered over the tabs
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    if (Math.abs(e.deltaX) > 0) return; // Native horizontal touchpad gestures

    if (scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
      if (e.deltaY !== 0) {
        scrollRef.current.scrollLeft += e.deltaY;
        checkScrollLimits();
      }
    }
  };

  // Mouse drag-to-slide handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    startScrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const distance = x - startX.current;

    if (Math.abs(distance) > 4) {
      hasDragged.current = true;
    }

    scrollRef.current.scrollLeft = startScrollLeft.current - distance * 1.25;
    checkScrollLimits();
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* ─── Main Tabs Slide Strip ─── */}
      <div className="relative flex items-center group/tabbar select-none">
        {/* Left Slide Arrow Button */}
        <div
          className={`absolute left-0 top-0 bottom-1 z-20 flex items-center pr-1 transition-all duration-200 ${
            canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => slide('left')}
            title="Slide icons left"
            aria-label="Slide icons left"
            className="h-8 w-8 rounded-full border border-line bg-surface text-ink shadow-md shadow-black/10 backdrop-blur-md flex items-center justify-center hover:bg-card-hover hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-1 ring-black/5 dark:ring-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Left Gradient Mask */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-1 w-12 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-10" />
        )}

        {/* Scrollable / Draggable Tab Bar */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex space-x-1.5 overflow-x-auto scrollbar-none pb-2 pt-0.5 px-0.5 scroll-smooth cursor-grab active:cursor-grabbing w-full"
          role="tablist"
          aria-label={ariaLabel}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  if (el) tabButtonRefs.current.set(t.id, el);
                  else tabButtonRefs.current.delete(t.id);
                }}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  if (!hasDragged.current) {
                    onTabChange(t.id);
                  }
                }}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shrink-0 select-none ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20 font-bold'
                    : 'text-zinc-800 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-surface/80 border border-transparent'
                }`}
              >
                {t.icon && <span className="text-sm shrink-0">{t.icon}</span>}
                <span className="font-semibold tracking-tight">{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface text-zinc-700 dark:text-zinc-200 border border-line'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Gradient Mask */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10" />
        )}

        {/* Right Slide Arrow Button */}
        <div
          className={`absolute right-0 top-0 bottom-1 z-20 flex items-center pl-1 transition-all duration-200 ${
            canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => slide('right')}
            title="Slide icons right"
            aria-label="Slide icons right"
            className="h-8 w-8 rounded-full border border-line bg-surface text-ink shadow-md shadow-black/10 backdrop-blur-md flex items-center justify-center hover:bg-card-hover hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-1 ring-black/5 dark:ring-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Slide Controls Toolbar / Indicator ─── */}
      {hasOverflow && (
        <div className="flex items-center justify-between px-2 pt-0.5 text-[11px] text-muted-foreground border-t border-line/40">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink flex items-center gap-1">
              <span>↔ Slide Icons:</span>
            </span>
            <div className="inline-flex items-center gap-1 bg-surface px-1.5 py-0.5 rounded-lg border border-line text-[10px]">
              <button
                type="button"
                onClick={() => slide('left')}
                disabled={!canScrollLeft}
                className={`p-0.5 rounded hover:bg-card-hover transition-colors ${
                  canScrollLeft
                    ? 'text-ink cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                }`}
                title="Slide left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono px-0.5">
                {Math.round(scrollProgress)}%
              </span>
              <button
                type="button"
                onClick={() => slide('right')}
                disabled={!canScrollRight}
                className={`p-0.5 rounded hover:bg-card-hover transition-colors ${
                  canScrollRight
                    ? 'text-ink cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                }`}
                title="Slide right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="hidden sm:inline text-[10px] opacity-75">
              (Use buttons, mouse drag, or trackpad to slide)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden border border-line">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-150"
                style={{ width: `${Math.max(12, scrollProgress)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
