import { Bot, GitCompare, MessageSquareText } from 'lucide-react';
import type { AdminAiFeatureBreakdown } from '../types';

interface AdminAiByFeatureCardProps {
  features: AdminAiFeatureBreakdown[];
}

const FEATURE_CONFIG = {
  assistant: {
    title: 'Shopping Assistant',
    description: 'Conversational recommendations & product match queries',
    icon: Bot,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
  },
  compare: {
    title: 'Compare Verdict',
    description: 'Multi-product spec analysis & decision verdicts',
    icon: GitCompare,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  review_summary: {
    title: 'Review Summary',
    description: 'Synthesized customer feedback & sentiment synthesis',
    icon: MessageSquareText,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
  },
} as const;

export function AdminAiByFeatureCard({ features }: AdminAiByFeatureCardProps) {
  const totalVolume = features.reduce((acc, f) => acc + f.total_calls, 0);

  return (
    <div
      className="rounded-card border border-border bg-card p-5 shadow-card"
      data-testid="ai-by-feature-card"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Feature breakdown
        </h2>
        <p className="text-xs text-muted-foreground">
          Usage volume, success reliability, and token consumption by AI
          capability.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {features.map((item) => {
          const config = FEATURE_CONFIG[
            item.feature as keyof typeof FEATURE_CONFIG
          ] ?? {
            title: item.feature,
            description: '',
            icon: Bot,
            color: 'text-primary',
            bg: 'bg-muted',
          };
          const Icon = config.icon;
          const percentage =
            totalVolume > 0
              ? Math.round((item.total_calls / totalVolume) * 100)
              : 0;
          const successRate =
            item.total_calls > 0
              ? Math.round((item.successful_calls / item.total_calls) * 100)
              : 100;

          return (
            <div
              key={item.feature}
              className="rounded-control border border-border/60 bg-muted/20 p-3.5 transition-colors hover:bg-muted/40"
              data-testid={`feature-breakdown-${item.feature}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-control ${config.bg} ${config.color}`}
                  >
                    <Icon
                      className="size-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {config.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-foreground">
                    {item.total_calls.toLocaleString('en-US')}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({percentage}%)
                    </span>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {successRate}% success
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.max(percentage, item.total_calls > 0 ? 3 : 0)}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Tokens:{' '}
                  <strong className="text-foreground">
                    {item.total_tokens.toLocaleString('en-US')}
                  </strong>
                </span>
                <span>
                  Latency:{' '}
                  <strong className="text-foreground">
                    {item.avg_latency_ms} ms
                  </strong>
                </span>
                <span>
                  Failed:{' '}
                  <strong
                    className={
                      item.failed_calls > 0
                        ? 'text-destructive font-semibold'
                        : 'text-foreground'
                    }
                  >
                    {item.failed_calls}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
