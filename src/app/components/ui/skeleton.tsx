import { cn } from './utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-[#E8E0D0]', className)}
      {...props}
    />
  );
}

export { Skeleton };
