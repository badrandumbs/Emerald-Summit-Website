import { cn } from '@/lib/utils';

/**
 * EHS Academic Foundation seal (navy ring, green EAF, "Empathy | Academics |
 * Fellowship"). Cropped from the foundation's artwork to a 512px square on
 * white, at public/brand/eaf-logo.png; show it inside a white circle.
 */
export default function EafLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/eaf-logo.png"
      alt="EHS Academic Foundation"
      draggable={false}
      className={cn('block h-full w-full object-contain', className)}
    />
  );
}
