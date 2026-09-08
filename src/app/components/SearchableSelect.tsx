import { useState, type ReactNode } from 'react';
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
  CommandSeparator,
} from './ui/command';

const TRIGGER =
  'w-full rounded-xl border border-[#D4CDB5]/70 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all flex items-center justify-between gap-2 text-left';

const GROUP_HEADING =
  '[&_[cmdk-group-heading]]:text-[#8A7E6E] [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:font-semibold';

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  disabled = false,
  loading = false,
  renderLeading,
  suggested = [],
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  renderLeading?: (item: string) => ReactNode;
  suggested?: string[];
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = value && !options.includes(value) ? [value, ...options] : options;
  const suggestedItems = suggested.filter((item) => items.includes(item));
  const suggestedSet = new Set(suggestedItems);
  const restItems = items.filter((item) => !suggestedSet.has(item));
  const label = loading ? 'Loading…' : value || placeholder;

  const renderItem = (item: string, keyPrefix = '') => (
    <CommandItem
      key={`${keyPrefix}${item}`}
      value={item}
      onSelect={() => {
        onChange(item === value ? '' : item);
        setOpen(false);
      }}
      className="text-sm text-[#1E2A35] data-[selected=true]:bg-[#c49a3c]/10 data-[selected=true]:text-[#1E2A35]"
    >
      <Check
        size={14}
        className={item === value ? 'opacity-100 text-[#c49a3c]' : 'opacity-0'}
      />
      {renderLeading?.(item)}
      <span className="truncate">{item}</span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={`${TRIGGER} ${value ? 'pr-20' : ''} ${
              invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-200/80' : ''
            } ${
              disabled ? 'bg-[#F8F3E8] text-[#C0B8A8] cursor-not-allowed' : value ? 'text-[#1E2A35]' : 'text-[#C0B8A8]'
            }`}
          >
            <span className="min-w-0 flex items-center gap-2">
              {!loading && value && renderLeading?.(value)}
              <span className="truncate">{label}</span>
            </span>
            <ChevronsUpDown size={16} className="shrink-0 text-[#9A8E7E]" />
          </button>
        </PopoverTrigger>
        <FieldClearButton
          visible={Boolean(value) && !loading}
          onClick={() => onChange('')}
          className="right-9 top-1/2 -translate-y-1/2"
        />
      </div>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border-[#D4CDB5]/70 rounded-xl shadow-lg"
      >
        <Command className="bg-white">
          <CommandInput placeholder={searchPlaceholder} className="text-sm" />
          <CommandList className="max-h-56">
            <CommandEmpty className="text-[#8A7E6E] text-sm py-4">{emptyText}</CommandEmpty>
            {suggestedItems.length > 0 && (
              <CommandGroup heading="Suggested" className={GROUP_HEADING}>
                {suggestedItems.map((item) => renderItem(item, 'suggested-'))}
              </CommandGroup>
            )}
            {suggestedItems.length > 0 && restItems.length > 0 && (
              <CommandSeparator className="bg-[#D4CDB5]/70" />
            )}
            {restItems.length > 0 && (
              <CommandGroup
                heading={suggestedItems.length > 0 ? 'All' : undefined}
                className={GROUP_HEADING}
              >
                {restItems.map((item) => renderItem(item))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
