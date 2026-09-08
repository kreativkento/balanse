import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function FieldClearButton({
  onClick,
  visible,
  className = 'right-3 top-1/2 -translate-y-1/2',
}: {
  onClick: () => void;
  visible: boolean;
  className?: string;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`absolute z-10 text-[11px] font-semibold tracking-wide text-[#9A8E7E] hover:text-[#c49a3c] ${className}`}
    >
      Clear
    </button>
  );
}

export function ClearableInput({
  value,
  onClear,
  suffix,
  className = '',
  clearClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onClear: () => void;
  suffix?: string;
  clearClassName?: string;
}) {
  const hasValue = String(value ?? '').length > 0;
  const hasCustomPad = /\bpr-/.test(className);
  const padRight = hasCustomPad
    ? ''
    : hasValue && suffix
      ? 'pr-[4.75rem]'
      : hasValue
        ? 'pr-14'
        : suffix
          ? 'pr-12'
          : '';

  return (
    <div className="relative">
      <input value={value} className={`${className} ${padRight}`} {...props} />
      {suffix && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 text-[#9A8E7E] text-xs font-medium pointer-events-none ${
            hasValue ? 'right-14' : 'right-4'
          }`}
        >
          {suffix}
        </span>
      )}
      <FieldClearButton visible={hasValue} onClick={onClear} className={clearClassName} />
    </div>
  );
}

export function ClearableTextarea({
  value,
  onClear,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  onClear: () => void;
}) {
  const hasValue = String(value ?? '').length > 0;
  return (
    <div className="relative">
      <textarea value={value} className={`${className} ${hasValue ? 'pr-14' : ''}`} {...props} />
      <FieldClearButton visible={hasValue} onClick={onClear} className="right-3 top-3 translate-y-0" />
    </div>
  );
}
