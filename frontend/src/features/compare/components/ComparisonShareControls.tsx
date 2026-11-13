import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useShareComparison,
  useStopSharingComparison,
} from '@/features/compare/hooks/use-saved-comparisons';
import type { SavedComparison } from '@/features/compare/types/saved-comparison';

function shareUrl(token: string): string {
  return `${window.location.origin}/compare/shared/${token}`;
}

export function ComparisonShareControls({
  comparison,
}: {
  comparison: SavedComparison;
}) {
  const share = useShareComparison();
  const stopSharing = useStopSharingComparison();
  const [copied, setCopied] = useState(false);
  const token = comparison.share_token;
  const link = token ? shareUrl(token) : null;

  function handleShare(): void {
    share.mutate(comparison.id, {
      onSuccess: () => toast.success('Share link ready.'),
      onError: () => toast.error("Couldn't create a share link. Try again."),
    });
  }

  async function handleCopy(): Promise<void> {
    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied.');
    } catch {
      toast.error('Select the link and copy it manually.');
    }
  }

  function handleStopSharing(): void {
    stopSharing.mutate(comparison.id, {
      onSuccess: () => {
        setCopied(false);
        toast.success('Sharing stopped. The link no longer works.');
      },
      onError: () => toast.error("Couldn't stop sharing. Try again."),
    });
  }

  if (!link) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={share.isPending}
          onClick={handleShare}
        >
          {share.isPending ? 'Creating link…' : 'Share'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Anyone with the link can view this comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-control border border-border bg-muted/30 p-3">
      <Label htmlFor={`comparison-share-${comparison.id}`} className="mb-1.5">
        Read-only share link
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`comparison-share-${comparison.id}`}
          value={link}
          readOnly
          className="font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          <Copy aria-hidden="true" />
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="mt-2 text-muted-foreground"
        disabled={stopSharing.isPending}
        onClick={handleStopSharing}
      >
        {stopSharing.isPending ? 'Stopping sharing…' : 'Stop sharing'}
      </Button>
    </div>
  );
}
