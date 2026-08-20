import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { ProductsTranslations } from '../translations';
import { publicCatalogDescriptionCanExpand } from './utils/publicCatalogPresentation';

export function PublicCatalogExpandableDescription({
  description,
  t,
  compact = false,
  className,
}: {
  description: string;
  t: ProductsTranslations;
  compact?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const normalizedDescription = description.trim();
  const canExpand = publicCatalogDescriptionCanExpand(normalizedDescription, compact);

  return (
    <div className={className}>
      <p className={cn(
        compact
          ? 'text-xs font-medium leading-5 text-slate-500 dark:text-slate-400'
          : 'text-sm leading-6 text-slate-600 dark:text-slate-300',
        canExpand && !expanded && 'line-clamp-2',
      )}>
        {normalizedDescription}
      </p>
      {canExpand ? (
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-1 rounded-md text-xs font-medium text-[#C9372C] transition hover:text-[#A62B23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/50"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? t.publicCatalog.readLess : t.publicCatalog.readMore}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      ) : null}
    </div>
  );
}
