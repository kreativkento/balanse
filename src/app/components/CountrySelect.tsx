import { COUNTRIES, getCountryIso2 } from '../data/nationalities';
import { SearchableSelect } from './SearchableSelect';

export function CountryFlag({
  country,
  className = '',
}: {
  country?: string | null;
  className?: string;
}) {
  const code = getCountryIso2(country);
  if (!code) {
    return (
      <span
        className={`inline-block w-5 h-3.5 shrink-0 rounded-[2px] bg-[#EDE8D8] border border-[#D4CDB5]/70 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={20}
      height={15}
      alt=""
      className={`w-5 h-3.5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(212,205,181,0.7)] ${className}`}
    />
  );
}

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country…',
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={COUNTRIES}
      placeholder={placeholder}
      searchPlaceholder="Search country…"
      emptyText="No country found."
      renderLeading={(country) => <CountryFlag country={country} />}
      suggested={['Philippines']}
      invalid={invalid}
    />
  );
}
