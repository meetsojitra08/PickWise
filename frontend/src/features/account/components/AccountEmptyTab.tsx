import { GitCompare, Heart, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { AccountTabKey } from '../types/account';

interface AccountEmptyTabProps {
  tab: Extract<AccountTabKey, 'wishlist' | 'comparisons' | 'conversations'>;
}

const EMPTY_TAB_CONFIG = {
  wishlist: {
    title: 'Your wishlist is empty',
    description:
      'Heart a product while browsing the catalog to keep it here for quick review and comparison.',
    actionLabel: 'Browse products',
    actionTo: '/products',
    Icon: Heart,
  },
  comparisons: {
    title: 'No saved comparisons yet',
    description:
      'Compare 2 to 4 products side by side and save the spec matrix to revisit or share later.',
    actionLabel: 'Compare products',
    actionTo: '/compare',
    Icon: GitCompare,
  },
  conversations: {
    title: 'No assistant conversations yet',
    description:
      'Ask the shopping assistant for budget-aware recommendations and your threads will appear here.',
    actionLabel: 'Open assistant',
    actionTo: '/assistant',
    Icon: MessageSquare,
  },
} as const;

export function AccountEmptyTab({ tab }: AccountEmptyTabProps) {
  const { title, description, actionLabel, actionTo, Icon } =
    EMPTY_TAB_CONFIG[tab];

  return (
    <EmptyState
      title={title}
      description={description}
      actionLabel={actionLabel}
      actionTo={actionTo}
      icon={<Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />}
    />
  );
}
