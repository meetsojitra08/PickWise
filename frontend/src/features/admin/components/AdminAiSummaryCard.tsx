import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminAiUsageSummary } from '../types';

export interface AdminAiSummaryCardProps {
  aiUsage: AdminAiUsageSummary;
}

export function AdminAiSummaryCard({ aiUsage }: AdminAiSummaryCardProps) {
  const successRate =
    aiUsage.total_calls > 0
      ? Math.round((aiUsage.successful_calls / aiUsage.total_calls) * 100)
      : 100;

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-control bg-accent/20 text-warning dark:text-accent">
            <Bot className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              AI Runtime Overview (Today)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Assistant queries, compare verdicts, and review summaries
            </p>
          </div>
        </div>

        <Link
          to="/admin/ai"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Detailed analytics
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-control border border-border/60 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2
                className="size-3.5 text-positive"
                aria-hidden="true"
              />
              <span>Successful</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {aiUsage.successful_calls.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {successRate}% success rate
            </div>
          </div>

          <div className="rounded-control border border-border/60 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <XCircle className="size-3.5 text-negative" aria-hidden="true" />
              <span>Failed / Throttled</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {aiUsage.failed_calls.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {aiUsage.failed_calls > 0 ? 'Provider errors' : 'Zero failures'}
            </div>
          </div>

          <div className="rounded-control border border-border/60 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cpu className="size-3.5 text-primary" aria-hidden="true" />
              <span>Tokens Volume</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {aiUsage.total_tokens.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Prompt + completion
            </div>
          </div>

          <div className="rounded-control border border-border/60 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <span>Avg Latency</span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {aiUsage.avg_latency_ms}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                ms
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Response time
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
