import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, MapPin, X } from 'lucide-react';
import type { Language } from '../types';
import {
  BD_GEO_DATA,
  findBdDistrict,
  getUpazilasByDistrict,
} from '../utils/bdGeoData';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  searchTerms?: string[];
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  variant?: 'default' | 'dark-aware' | 'compact';
  icon?: React.ReactNode;
  className?: string;
  dropdownAlign?: 'left' | 'right';
  ariaLabel?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  disabled = false,
  variant = 'default',
  icon,
  className = '',
  dropdownAlign = 'left',
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected option lookup (case-insensitive fallback)
  const selectedOption = useMemo(() => {
    const exact = options.find((o) => o.value === value);
    if (exact) return exact;
    const lower = (value || '').trim().toLowerCase();
    return options.find((o) => o.value.toLowerCase() === lower);
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      if (opt.label.toLowerCase().includes(q)) return true;
      if (opt.value.toLowerCase().includes(q)) return true;
      if (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) return true;
      if (opt.searchTerms && opt.searchTerms.some((term) => term.toLowerCase().includes(q))) {
        return true;
      }
      return false;
    });
  }, [options, query]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Focus search box when opened and reset highlight
  useEffect(() => {
    if (open) {
      setQuery('');
      const currentIdx = options.findIndex(
        (o) => o.value.toLowerCase() === (value || '').toLowerCase()
      );
      setHighlightIdx(currentIdx >= 0 ? currentIdx : 0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [open, options, value]);

  // Reset highlight index when search query changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  // Keep highlighted option visible when navigating via keyboard
  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-opt-idx="${highlightIdx}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx, open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightIdx];
      if (target) handleSelect(target.value);
    }
  };

  const triggerClasses =
    variant === 'compact'
      ? 'px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-stone-800'
      : variant === 'dark-aware'
      ? 'w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500'
      : 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-stone-50 hover:bg-white text-stone-800 focus:ring-2 focus:ring-emerald-500';

  const panelClasses =
    variant === 'dark-aware'
      ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100'
      : 'bg-white border-stone-200 text-stone-800';

  return (
    <div
      ref={containerRef}
      className={`relative ${variant === 'compact' ? 'inline-block' : 'w-full'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-1.5 transition-colors focus:outline-none ${triggerClasses} ${
          disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : value || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-65 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && !disabled && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[230px] w-full sm:min-w-[250px] rounded-2xl border shadow-xl overflow-hidden animate-fade-in ${
            dropdownAlign === 'right' ? 'right-0' : 'left-0'
          } ${panelClasses}`}
        >
          {/* Search Input Header */}
          <div
            className={`p-2 border-b ${
              variant === 'dark-aware'
                ? 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80'
                : 'border-stone-100 bg-stone-50/90'
            }`}
          >
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  variant === 'dark-aware'
                    ? 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400'
                    : 'bg-white border-stone-200 text-stone-900 placeholder:text-stone-400'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 divide-y divide-stone-100/60 dark:divide-stone-800/60"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-stone-400 font-medium">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  selectedOption?.value === opt.value ||
                  opt.value.toLowerCase() === (value || '').toLowerCase();
                const isHighlighted = idx === highlightIdx;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-opt-idx={idx}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? variant === 'dark-aware'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                          : 'bg-emerald-50 text-emerald-800 font-bold'
                        : isHighlighted
                        ? variant === 'dark-aware'
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white font-medium'
                          : 'bg-stone-100 text-stone-900 font-medium'
                        : variant === 'dark-aware'
                        ? 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {opt.sublabel && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            variant === 'dark-aware'
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SPECIALIZED 64-DISTRICT SELECTOR ────────────────────────────────────────

export interface DistrictSelectProps {
  value: string;
  onChange: (district: string) => void;
  language: Language;
  includeAll?: boolean;
  allValue?: string;
  allLabelEn?: string;
  allLabelBn?: string;
  disabled?: boolean;
  variant?: 'default' | 'dark-aware' | 'compact';
  showIcon?: boolean;
  className?: string;
  dropdownAlign?: 'left' | 'right';
  ariaLabel?: string;
}

export const DistrictSelect: React.FC<DistrictSelectProps> = ({
  value,
  onChange,
  language,
  includeAll = false,
  allValue = 'All',
  allLabelEn = 'All Districts (64)',
  allLabelBn = 'সকল জেলা (৬৪টি)',
  disabled = false,
  variant = 'default',
  showIcon = false,
  className = '',
  dropdownAlign = 'left',
  ariaLabel,
}) => {
  // Normalize legacy aliases (e.g. 'Bogra' -> 'Bogura', 'Chittagong' -> 'Chattogram') for clean matching
  const resolvedValue = useMemo(() => {
    if (includeAll && value.toLowerCase() === allValue.toLowerCase()) return allValue;
    const found = findBdDistrict(value);
    return found ? found.district : value;
  }, [value, includeAll, allValue]);

  const options = useMemo<SearchableOption[]>(() => {
    const list: SearchableOption[] = [];
    if (includeAll) {
      list.push({
        value: allValue,
        label: language === 'bn' ? allLabelBn : allLabelEn,
        searchTerms: ['all', 'সকল জেলা', 'সব জেলা', 'all districts'],
      });
    }

    for (const d of BD_GEO_DATA) {
      const label =
        variant === 'compact'
          ? language === 'bn'
            ? d.districtBn
            : d.district
          : language === 'bn'
          ? `${d.districtBn} (${d.district})`
          : `${d.district} (${d.districtBn})`;

      list.push({
        value: d.district,
        label,
        sublabel: language === 'bn' ? d.divisionBn : d.division,
        searchTerms: [
          d.district,
          d.districtBn,
          d.division,
          d.divisionBn,
          ...d.aliases,
        ],
      });
    }
    return list;
  }, [language, includeAll, allValue, allLabelBn, allLabelEn, variant]);

  return (
    <SearchableSelect
      options={options}
      value={resolvedValue}
      onChange={onChange}
      placeholder={language === 'bn' ? 'জেলা নির্বাচন করুন' : 'Select District'}
      searchPlaceholder={
        language === 'bn'
          ? 'জেলা খুঁজুন (বাংলা বা English)...'
          : 'Search 64 districts (English or বাংলা)...'
      }
      emptyText={language === 'bn' ? 'কোনো জেলা পাওয়া যায়নি' : 'No district found'}
      disabled={disabled}
      variant={variant}
      icon={showIcon ? <MapPin className="w-3.5 h-3.5 text-emerald-600" /> : undefined}
      className={className}
      dropdownAlign={dropdownAlign}
      ariaLabel={ariaLabel || (language === 'bn' ? 'জেলা নির্বাচন' : 'Select district')}
    />
  );
};

// ─── SPECIALIZED DYNAMIC UPAZILA SELECTOR ────────────────────────────────────

export interface UpazilaSelectProps {
  district: string;
  value: string;
  onChange: (upazila: string) => void;
  language: Language;
  includeAll?: boolean;
  allValue?: string;
  allLabelEn?: string;
  allLabelBn?: string;
  preserveLegacyValue?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'dark-aware' | 'compact';
  className?: string;
  dropdownAlign?: 'left' | 'right';
  ariaLabel?: string;
}

export const UpazilaSelect: React.FC<UpazilaSelectProps> = ({
  district,
  value,
  onChange,
  language,
  includeAll = false,
  allValue = 'All',
  allLabelEn = 'All Upazilas',
  allLabelBn = 'সকল উপজেলা',
  preserveLegacyValue = false,
  disabled = false,
  variant = 'default',
  className = '',
  dropdownAlign = 'left',
  ariaLabel,
}) => {
  const isAllDistrict =
    !district || district.toLowerCase() === 'all';

  const upazilas = useMemo(() => {
    if (isAllDistrict) return [];
    const preserve =
      preserveLegacyValue && value && value.toLowerCase() !== allValue.toLowerCase()
        ? value
        : undefined;
    return getUpazilasByDistrict(district, preserve);
  }, [district, isAllDistrict, preserveLegacyValue, value, allValue]);

  const options = useMemo<SearchableOption[]>(() => {
    const list: SearchableOption[] = [];
    if (includeAll) {
      list.push({
        value: allValue,
        label: language === 'bn' ? allLabelBn : allLabelEn,
        searchTerms: ['all', 'সকল উপজেলা', 'সব উপজেলা', 'all upazilas'],
      });
    }
    for (const u of upazilas) {
      const label =
        variant === 'compact'
          ? language === 'bn'
            ? u.bn
            : u.en
          : language === 'bn'
          ? `${u.bn} (${u.en})`
          : `${u.en} (${u.bn})`;

      list.push({
        value: u.en,
        label,
        searchTerms: [u.en, u.bn],
      });
    }
    return list;
  }, [upazilas, includeAll, allValue, allLabelBn, allLabelEn, language, variant]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={
        isAllDistrict
          ? language === 'bn'
            ? 'আগে জেলা নির্বাচন করুন'
            : 'Select District first'
          : language === 'bn'
          ? 'উপজেলা নির্বাচন করুন'
          : 'Select Upazila'
      }
      searchPlaceholder={
        language === 'bn'
          ? 'উপজেলা খুঁজুন (বাংলা বা English)...'
          : 'Search upazila (English or বাংলা)...'
      }
      emptyText={language === 'bn' ? 'কোনো উপজেলা পাওয়া যায়নি' : 'No upazila found'}
      disabled={disabled || isAllDistrict}
      variant={variant}
      className={className}
      dropdownAlign={dropdownAlign}
      ariaLabel={ariaLabel || (language === 'bn' ? 'উপজেলা নির্বাচন' : 'Select upazila')}
    />
  );
};
