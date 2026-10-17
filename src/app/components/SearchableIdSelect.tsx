import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { FieldClearButton } from './FieldClearButton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';

const TRIGGER =
  'w-full rounded-2xl border border-[#D4CDB5]/70 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all flex items-center justify-between gap-2 text-left';

const GROUP_HEADING =
  '[&_[cmdk-group-heading]]:text-[#8A7E6E] [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:font-semibold';

export type SearchableIdOption = {
  value: string;
  label: string;
  /** Included in cmdk filter text (e.g. email, reference codes). */
  keywords?: string;
};

export function SearchableIdSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  disabled = false,
  loading = false,
  invalid = false,
  searchable = true,
  clearable = true,
  renderLeading,
  renderOption,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableIdOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  /** When false, hides the filter input (for short fixed lists). */
  searchable?: boolean;
  clearable?: boolean;
  renderLeading?: (option: SearchableIdOption | undefined) => ReactNode;
  renderOption?: (option: SearchableIdOption) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const label = loading ? 'Loading…' : selected?.label ?? placeholder;

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && !loading && setOpen(next)}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={`${TRIGGER} ${value && clearable ? 'pr-20' : ''} ${
              invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-200/80' : ''
            } ${
              disabled || loading
                ? 'bg-[#F8F3E8] text-[#C0B8A8] cursor-not-allowed'
                : selected
                  ? 'text-[#1E2A35]'
                  : 'text-[#C0B8A8]'
            }`}
          >
            <span className="min-w-0 flex items-center gap-2">
              {!loading && renderLeading?.(selected)}
              <span className="truncate">{label}</span>
            </span>
            <ChevronsUpDown size={16} className="shrink-0 text-[#9A8E7E]" />
          </button>
        </PopoverTrigger>
        {clearable ? (
          <FieldClearButton
            visible={Boolean(value) && !loading && !disabled}
            onClick={() => onChange('')}
            className="right-9 top-1/2 -translate-y-1/2"
          />
        ) : null}
      </div>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border-[#D4CDB5]/70 rounded-xl shadow-lg"
      >
        <Command className="bg-white" shouldFilter={searchable}>
          {searchable ? (
            <CommandInput placeholder={searchPlaceholder} className="text-sm" />
          ) : null}
          <CommandList className="max-h-56">
            <CommandEmpty className="text-[#8A7E6E] text-sm py-4">{emptyText}</CommandEmpty>
            <CommandGroup className={GROUP_HEADING}>
              {options.map((option) => {
                const cmdValue = `${option.label} ${option.keywords ?? ''}`.trim();
                return (
                  <CommandItem
                    key={option.value}
                    value={cmdValue}
                    onSelect={() => {
                      onChange(option.value === value ? '' : option.value);
                      setOpen(false);
                    }}
                    className="text-sm text-[#1E2A35] data-[selected=true]:bg-[#c49a3c]/10 data-[selected=true]:text-[#1E2A35]"
                  >
                    <Check
                      size={14}
                      className={
                        option.value === value ? 'opacity-100 text-[#c49a3c]' : 'opacity-0'
                      }
                    />
                    {renderOption ? (
                      renderOption(option)
                    ) : (
                      <span className="truncate">{option.label}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
