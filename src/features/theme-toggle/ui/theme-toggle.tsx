import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/providers/theme-provider';
import { cn } from '@/shared/lib/cn';

/** Icon crossfade + rotate; the actual theme swap is a class toggle on <html>. */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl',
        'text-content-muted transition-colors hover:bg-surface-sunken hover:text-content',
        className,
      )}
    >
      <motion.span
        className="absolute"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1, rotate: isDark ? -90 : 0, scale: isDark ? 0.6 : 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <Sun className="h-4 w-4" />
      </motion.span>
      <motion.span
        className="absolute"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0, rotate: isDark ? 0 : 90, scale: isDark ? 1 : 0.6 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <Moon className="h-4 w-4" />
      </motion.span>
    </button>
  );
};
