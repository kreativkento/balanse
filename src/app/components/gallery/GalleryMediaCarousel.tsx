import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import type { GalleryMediaItem } from '../../../lib/gallery-service';

export function GalleryMediaCarousel({
  media,
  alt,
  className,
  itemClassName,
}: {
  media: GalleryMediaItem[];
  alt: string;
  className?: string;
  itemClassName?: string;
}) {
  if (!media.length) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className={className}>
        {item.mediaKind === 'video' ? (
          <video
            src={item.url}
            className={itemClassName ?? 'w-full h-full object-cover'}
            controls
            playsInline
          />
        ) : (
          <img
            src={item.url}
            alt={alt}
            className={itemClassName ?? 'w-full h-full object-cover'}
          />
        )}
      </div>
    );
  }

  return (
    <Carousel className={className ?? 'w-full'} opts={{ loop: true }}>
      <CarouselContent className="ml-0">
        {media.map((item) => (
          <CarouselItem key={item.id} className="pl-0">
            {item.mediaKind === 'video' ? (
              <video
                src={item.url}
                className={itemClassName ?? 'w-full h-full object-cover'}
                controls
                playsInline
              />
            ) : (
              <img
                src={item.url}
                alt={alt}
                className={itemClassName ?? 'w-full h-full object-cover'}
              />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        variant="outline"
        className="left-2 border-white/40 bg-[#1E2A35]/70 text-white hover:bg-[#1E2A35]/90"
      >
        <ChevronLeft />
      </CarouselPrevious>
      <CarouselNext
        variant="outline"
        className="right-2 border-white/40 bg-[#1E2A35]/70 text-white hover:bg-[#1E2A35]/90"
      >
        <ChevronRight />
      </CarouselNext>
    </Carousel>
  );
}
