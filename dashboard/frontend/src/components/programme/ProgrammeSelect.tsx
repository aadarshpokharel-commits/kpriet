import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, GraduationCap, Loader2, RotateCw, Search } from 'lucide-react';
import { useProgrammes } from '@/hooks/useProgrammes';
import type { IProgrammeMaster } from '@/types/programme.types';
import { cn } from '@/utils/cn';

export interface ProgrammeSelectProps {
  /** Selected programmeId (stable code, e.g. "IT"). Empty string = nothing selected. */
  value: string;
  onChange: (programmeId: string, programme: IProgrammeMaster | null) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  /** Validation message shown under the field. */
  error?: string | null;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  /** Adds an "All programmes" choice (value "") for filters. */
  allowAll?: boolean;
  allLabel?: string;
  /** Override the list (e.g. admin views that include inactive programmes). Defaults to the programme master API. */
  programmes?: IProgrammeMaster[];
  className?: string;
}

function matches(p: IProgrammeMaster, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().replace(/&/g, 'and');
  const hay = `${p.name} ${p.shortName} ${p.programmeId}`.toLowerCase().replace(/&/g, 'and');
  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => hay.includes(part));
}

/**
 * Searchable programme picker backed by the central programme master.
 *
 * - Full programme names are always shown (they wrap instead of being clipped),
 *   e.g. "Electronics Engineering (VLSI Design and Technology)".
 * - Keyboard: ↑/↓ to move, Enter to choose, Esc to close, type to filter.
 * - Uses theme tokens so text stays readable in light and dark mode.
 */
export function ProgrammeSelect({
  value,
  onChange,
  id,
  label = 'Programme / Department',
  placeholder = 'Select Programme',
  error,
  helperText,
  required,
  disabled,
  allowAll = false,
  allLabel = 'All programmes',
  programmes: override,
  className,
}: ProgrammeSelectProps) {
  const autoId = useId();
  const fieldId = id || `programme-${autoId}`;
  const listId = `${fieldId}-listbox`;
  const messageId = `${fieldId}-message`;

  const { programmes: fromApi, isLoading, isError, refetch } = useProgrammes();
  const programmes = override ?? fromApi;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = programmes.find((p) => p.programmeId === value) ?? null;

  type Option = { key: string; programme: IProgrammeMaster | null };
  const options: Option[] = useMemo(() => {
    const filtered = programmes.filter((p) => matches(p, query)).map((p) => ({ key: p.programmeId, programme: p }));
    return allowAll && !query ? [{ key: '', programme: null }, ...filtered] : filtered;
  }, [programmes, query, allowAll]);

  // Close on outside click / focus leaving the component
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // When opening, focus search and highlight the current value
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.key === value);
      setActiveIndex(idx >= 0 ? idx : 0);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the active option in view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const choose = (opt: Option | undefined) => {
    if (!opt) return;
    onChange(opt.key, opt.programme);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(Math.max(options.length - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        choose(options[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const showError = Boolean(error);

  return (
    <div ref={rootRef} className={cn('relative space-y-1.5', className)} onKeyDown={onKeyDown}>
      {label && (
        <label
          htmlFor={fieldId}
          className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground"
        >
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {label}
          {required && <span className="text-error" aria-hidden>*</span>}
        </label>
      )}

      <button
        id={fieldId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={showError || undefined}
        aria-required={required || undefined}
        aria-describedby={showError || helperText ? messageId : undefined}
        disabled={disabled || (isLoading && !override)}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full min-h-[44px] items-start justify-between gap-2 rounded-xl border bg-input px-3 py-2.5 text-left text-sm text-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
          showError ? 'border-error focus:border-error focus:ring-error/20' : 'border-border'
        )}
      >
        <span className="min-w-0 flex-1">
          {isLoading && !override ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading programmes…
            </span>
          ) : selected ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-normal break-words font-medium leading-snug">{selected.name}</span>
              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground">
                {selected.programmeId}
              </span>
            </span>
          ) : allowAll && value === '' ? (
            <span className="font-medium">{allLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
          style={{ minWidth: 'min(100%, 18rem)' }}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programme or code…"
              aria-label="Search programmes"
              aria-controls={listId}
              aria-activedescendant={options[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-[min(20rem,55vh)] overflow-y-auto overscroll-contain py-1"
          >
            {isError && !override ? (
              <li className="flex items-center justify-between gap-2 px-3 py-3 text-sm text-error-text">
                <span>Could not load programmes.</span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
                </button>
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">No programme matches “{query}”.</li>
            ) : (
              options.map((opt, index) => {
                const isSelected = opt.key === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={opt.key || '__all'}
                    id={`${listId}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(opt)}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm',
                      isActive ? 'bg-primary-soft text-foreground' : 'text-foreground'
                    )}
                  >
                    <Check
                      className={cn('mt-0.5 h-4 w-4 shrink-0 text-primary', isSelected ? 'opacity-100' : 'opacity-0')}
                      aria-hidden
                    />
                    {opt.programme ? (
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-normal break-words font-medium leading-snug">
                          {opt.programme.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {opt.programme.type} · {opt.programme.programmeId}
                          {!opt.programme.isActive && ' · inactive'}
                        </span>
                      </span>
                    ) : (
                      <span className="flex-1 font-medium">{allLabel}</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {(showError || helperText) && (
        <p
          id={messageId}
          role={showError ? 'alert' : undefined}
          className={cn(
            'flex items-start gap-1 text-xs',
            showError ? 'font-medium text-error-text' : 'text-muted-foreground'
          )}
        >
          {showError && <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span>{showError ? error : helperText}</span>
        </p>
      )}
    </div>
  );
}
