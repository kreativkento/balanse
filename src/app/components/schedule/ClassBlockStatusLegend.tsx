import { CLASS_BLOCK_STATUS_LEGEND } from '../../../lib/admin-schedule-map';

/** `status_block` swatches for admin class schedule & time blocking toolbars. */
export function ClassBlockStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {CLASS_BLOCK_STATUS_LEGEND.map(({ status, label, color }) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#5A5048]"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm shadow-sm ring-1 ring-black/10"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
}
