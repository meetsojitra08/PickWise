import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Coins,
  Columns3,
  Cpu,
  Flame,
  Headphones,
  Keyboard,
  Laptop,
  Layers,
  MessageSquareText,
  Minus,
  Monitor,
  Scale,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Watch,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ProductCard } from '@/components/shared/ProductCard';
import { ProductCardSkeleton } from '@/components/shared/ProductCardSkeleton';
import { AiMark } from '@/components/shared/VerdictPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCatalogProducts } from '@/features/catalog/hooks/use-catalog-data';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { useCompareToggle } from '@/features/compare/hooks/use-compare-toggle';
import {
  useWishlist,
  useWishlistToggle,
} from '@/features/wishlist/hooks/use-wishlist';
import {
  STARTER_PROMPT_SUGGESTIONS,
  buildAssistantPromptUrl,
} from '@/features/assistant/lib/assistant-prompts';
import { cn } from '@/lib/utils';

interface CategoryTile {
  title: string;
  slug: string;
  description: string;
  icon: typeof Laptop;
  badge: string;
  highlights: string[];
  sampleModels: string;
  featured?: boolean;
}

const CATEGORY_TILES: CategoryTile[] = [
  {
    title: 'Laptops',
    slug: 'laptops',
    description: 'Creator ultrabooks, dev powerhouses & portable benchmarks.',
    icon: Laptop,
    badge: '10 verified models',
    highlights: ['Apple M3 / M4 Pro', 'OLED 120Hz', '32GB unified RAM'],
    sampleModels: 'MacBook Air M3, Dell XPS 13, ThinkPad T14s, Zephyrus G14',
    featured: true,
  },
  {
    title: 'Smartphones',
    slug: 'smartphones',
    description:
      'Camera flagships, compact kings & battery endurance champions.',
    icon: Smartphone,
    badge: '10 verified models',
    highlights: ['5x Periscope Zoom', 'Dynamic AMOLED 2X', '5,500mAh silicon'],
    sampleModels: 'iPhone 16 Pro, Galaxy S24, Pixel 9 Pro, OnePlus 12R',
    featured: true,
  },
  {
    title: 'Headphones & Audio',
    slug: 'headphones',
    description: 'Studio-grade ANC cans & high-fidelity true wireless earbuds.',
    icon: Headphones,
    badge: '10 verified models',
    highlights: ['Dual-driver hybrid', 'Lossless LDAC', '60h battery life'],
    sampleModels: 'Sony WH-1000XM5, AirPods Pro 2, Bose QuietComfort Ultra',
  },
  {
    title: 'Monitors & Displays',
    slug: 'monitors',
    description:
      'Color-accurate creator panels & ultra-fast OLED gaming displays.',
    icon: Monitor,
    badge: '10 verified models',
    highlights: ['4K IPS Black', '240Hz QD-OLED', '99% DCI-P3 calibrated'],
    sampleModels: 'LG UltraFine 27MD5KL, Dell UltraSharp U2724DE, BenQ PD2706U',
  },
  {
    title: 'Mechanical Keyboards',
    slug: 'keyboards',
    description: 'Hot-swappable custom boards with multi-device productivity.',
    icon: Keyboard,
    badge: '10 verified models',
    highlights: ['QMK/VIA open-source', 'Gasket mount', 'Tri-mode wireless'],
    sampleModels: 'Keychron Q1 Max, NuPhy Air75 V2, Keychron K2 Pro',
  },
  {
    title: 'Smartwatches & Gear',
    slug: 'smartwatches',
    description: 'Health diagnostic wearables, dual-engine chips & sports GPS.',
    icon: Watch,
    badge: '10 verified models',
    highlights: [
      'Dual-engine chips',
      'Medical-grade ECG',
      'Dual-frequency GPS',
    ],
    sampleModels: 'Apple Watch Series 10, Galaxy Watch 7, OnePlus Watch 2R',
  },
];

const PLATFORM_STATS = [
  {
    value: '60+',
    label: 'Audited Hardware Models',
    detail: 'Across 6 deep consumer tech categories with normalized specs.',
    icon: Cpu,
  },
  {
    value: '0%',
    label: 'Sponsored Bias',
    detail: 'No paid placements, affiliate boosts, or pay-to-win rankings.',
    icon: ShieldCheck,
  },
  {
    value: '100%',
    label: 'Budget Guardrail',
    detail: 'AI assistant strictly respects your hard rupee ceiling.',
    icon: Coins,
  },
  {
    value: '< 200ms',
    label: 'Side-by-Side Matrix',
    detail: 'Instant comparison across 30+ hardware parameters.',
    icon: Zap,
  },
];

const COMPARISON_ROWS = [
  {
    feature: 'Commercial Bias',
    traditional: 'Heavy paid ads, affiliate sponsorships & promoted listings',
    pickwise: '100% independent. No paid ranks or sponsor boosts ever.',
    pickwiseWins: true,
  },
  {
    feature: 'Hard Budget Adherence',
    traditional:
      'Pushes users to upsell; suggests products ₹20k–₹50k over budget',
    pickwise:
      'Strict budget ceiling. Alternatives over budget are flagged honestly.',
    pickwiseWins: true,
  },
  {
    feature: 'Spec Normalization',
    traditional: 'Inconsistent manufacturer jargon across 40 browser tabs',
    pickwise:
      'Standardized 30+ spec schema with unit conversions & percentile math.',
    pickwiseWins: true,
  },
  {
    feature: 'Side-by-Side Comparison',
    traditional: 'Manual tab switching or basic 2-column marketing blurbs',
    pickwise: 'Interactive 4-product matrix with per-row winner highlights.',
    pickwiseWins: true,
  },
  {
    feature: 'Customer Review Audit',
    traditional: 'Bot-polluted star averages and paid unboxer testimonials',
    pickwise:
      'AI-synthesized sentiment themes: verified pros vs real trade-offs.',
    pickwiseWins: true,
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Define your parameters',
    description:
      'Set your hard budget ceiling, select your category, and pick your non-negotiable requirements.',
    icon: Layers,
  },
  {
    step: '02',
    title: 'Inspect the Value Score',
    description:
      'Our engine benchmarks hardware spec percentiles against market price percentiles for transparent value.',
    icon: BarChart3,
  },
  {
    step: '03',
    title: 'Line up finalists in the matrix',
    description:
      'Compare up to 4 devices side-by-side with automatic winner highlights on display, battery, and power.',
    icon: Scale,
  },
  {
    step: '04',
    title: 'Get the AI Verdict & decide',
    description:
      'Read concise, grounded verdicts that detail exactly why a model fits your use-case and what you sacrifice.',
    icon: Sparkles,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

  // Load top value items for the live showcase
  const productsQuery = useCatalogProducts(
    {
      sort: 'value_desc',
      per_page: '6',
      ...(activeCategoryTab !== 'all' ? { category: activeCategoryTab } : {}),
    },
    `home-top-value-${activeCategoryTab}`,
  );

  const wishlist = useWishlist();
  const { toggle: toggleWishlist, isToggling } = useWishlistToggle();
  const compare = useCompare();
  const { toggle: toggleCompare } = useCompareToggle();

  const handleAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/assistant?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/assistant');
    }
  };

  const handleCatalogSearch = () => {
    const query = searchQuery.trim();
    if (query) {
      navigate(`/products?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/products');
    }
  };

  const showcaseProducts = productsQuery.data?.data.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-20 pb-24 sm:gap-28 sm:pb-32">
      {/* 1. HERO SECTION */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-background/95 to-muted/20 pt-10 pb-16 sm:pt-16 sm:pb-24"
      >
        {/* Subtle ambient background glow */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-xs">
              <span className="flex size-2 rounded-full bg-positive animate-pulse" />
              <span className="font-semibold text-primary">Pickwise 2.0</span>
              <span className="text-muted-foreground">·</span>
              <span>Hardware Intelligence & Grounded AI Verdicts</span>
            </div>

            {/* H1 Main Heading */}
            <h1
              id="hero-heading"
              className="mt-6 max-w-4xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08]"
            >
              Decide what to buy, with the homework done.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Cut through marketing jargon, bot reviews, and 40 open browser
              tabs. Pickwise benchmarks 60+ verified models with transparent
              Value Scores, side-by-side spec matrices, and budget-grounded AI
              verdicts.
            </p>

            {/* Modern Command Search Bar */}
            <div className="mt-10 w-full max-w-2xl">
              <form
                onSubmit={handleAssistantSubmit}
                action="/assistant"
                method="get"
                role="search"
                aria-label="Shopping assistant search"
                className="relative flex items-center rounded-surface border border-border/80 bg-card p-1.5 shadow-float transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
              >
                <Sparkles
                  className="ml-3.5 size-5 shrink-0 text-accent"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <label htmlFor="home-search" className="sr-only">
                  Search with shopping assistant
                </label>
                <Input
                  id="home-search"
                  type="search"
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What are you shopping for, and what's your budget?"
                  className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1.5 pr-1">
                  <Button
                    type="button"
                    onClick={handleCatalogSearch}
                    variant="ghost"
                    size="sm"
                    className="hidden gap-1.5 rounded-control text-xs sm:inline-flex text-muted-foreground hover:text-foreground"
                    title="Search catalog by keyword"
                  >
                    <Search className="size-3.5" aria-hidden="true" />
                    Catalog
                  </Button>
                  <Button
                    type="submit"
                    size="default"
                    className="gap-2 rounded-control"
                  >
                    <AiMark className="size-4 text-accent" />
                    <span>Ask Assistant</span>
                    <ArrowRight
                      className="size-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </form>

              {/* Quick prompt suggestions */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Try asking:</span>
                {STARTER_PROMPT_SUGGESTIONS.map((prompt) => (
                  <button
                    key={prompt.text}
                    type="button"
                    onClick={() => navigate(buildAssistantPromptUrl(prompt))}
                    className="rounded-full border border-border/70 bg-card/60 px-3 py-1 transition-colors hover:border-primary/40 hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring cursor-pointer"
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary navigation actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-control">
                <Link to="/products">
                  Browse 60+ products
                  <ArrowRight
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-control"
              >
                <Link to="/compare">
                  <Columns3
                    className="size-4 text-primary"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Compare finalists
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-control"
              >
                <Link to="/assistant">
                  <MessageSquareText
                    className="size-4 text-accent"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Ask shopping assistant
                </Link>
              </Button>
            </div>
          </div>

          {/* Interactive SaaS Product Mockup Preview */}
          <div className="mt-14 sm:mt-18">
            <div className="overflow-hidden rounded-surface border border-border/80 bg-card shadow-float">
              {/* Window chrome header */}
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-destructive/60" />
                  <span className="size-3 rounded-full bg-warning/60" />
                  <span className="size-3 rounded-full bg-positive/60" />
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    pickwise.app/verdict
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/30 text-xs font-normal text-primary"
                  >
                    <ShieldCheck
                      className="size-3"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Audited hardware specs
                  </Badge>
                </div>
              </div>

              {/* Showcase content: Verdict signature demo */}
              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:gap-8 lg:p-8">
                {/* Left side: Contestants in comparison */}
                <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      <Scale
                        className="size-3.5 text-primary"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span>Active Comparison · 3 Finalists</span>
                    </div>
                    <h3 className="mt-1.5 font-heading text-xl font-semibold text-foreground">
                      Laptops for 4K video editing & travel
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Benchmark comparison evaluated across 18 specifications
                      under ₹1,00,000 budget cap.
                    </p>
                  </div>

                  {/* 3 mini product contestant cards */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-control border border-primary/40 bg-primary/5 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-card font-semibold text-primary shadow-xs">
                          #1
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Apple MacBook Air 15" M3
                          </div>
                          <div className="text-xs text-muted-foreground">
                            16GB / 512GB · 1.51kg
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-positive/15 text-positive font-semibold">
                        94% Fit
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-control border border-border/70 bg-card p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground">
                          #2
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            Dell XPS 13 9340
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Intel Core Ultra 7 · 1.19kg
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        86% Fit
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-control border border-border/70 bg-card p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground">
                          #3
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            Lenovo ThinkPad T14s Gen 5
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Snapdragon X Elite · 1.24kg
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        83% Fit
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                    <CheckCircle2
                      className="size-4 text-positive"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>All models verified inside target budget</span>
                  </div>
                </div>

                {/* Right side: Pickwise Signature Verdict Card */}
                <div className="rounded-card border-l-4 border-l-accent border-y border-r border-border/80 bg-verdict-surface p-5 sm:p-6 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-foreground">
                        ◈
                      </span>
                      <span className="font-heading text-sm font-semibold text-foreground">
                        AI Verdict & Fit Analysis
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Confidence
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: '94%' }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">
                          94%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-heading text-lg font-bold text-foreground">
                      Best Overall Choice: Apple MacBook Air 15" M3
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Delivers the best sustained ProRes timeline rendering
                      speed per watt without thermal throttling, paired with an
                      authentic 18-hour battery run-time.
                    </p>
                  </div>

                  {/* Why it fits */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Why it fits your workflow
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-positive"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>
                          <strong>32GB Unified Memory:</strong> Zero paging
                          stutters during multi-track 4K ProRes timelines.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-positive"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>
                          <strong>Silent fanless design:</strong> Stays
                          completely noiseless during audio voiceover recording.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-positive"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>
                          <strong>Liquid Retina 500 nits:</strong> Factory
                          calibrated DCI-P3 gamut for reliable color grading.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Trade-offs */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Honest trade-offs to know
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Minus
                          className="mt-0.5 size-4 shrink-0 text-destructive"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>
                          Dual-display output requires laptop display lid to
                          remain closed.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Minus
                          className="mt-0.5 size-4 shrink-0 text-destructive"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>
                          Port selection limited to 2x Thunderbolt 4 and MagSafe
                          charging.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Verdict footer note */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    <span>
                      Synthesized from 18 verified specs & 214 approved shopper
                      reviews
                    </span>
                    <Button asChild size="sm" className="h-8 rounded-control">
                      <Link to="/compare">Open Full Matrix</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROOF METRICS BAR */}
      <section
        aria-label="Platform proof metrics"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="grid grid-cols-1 divide-y divide-border/60 rounded-surface border border-border/80 bg-card shadow-xs sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {PLATFORM_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-control bg-primary/10 text-primary">
                    <Icon
                      className="size-5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="font-heading text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {stat.value}
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">
                  {stat.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {stat.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. CATEGORY BENTO GRID */}
      <section
        aria-labelledby="categories-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
              <Layers className="size-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Catalog Coverage</span>
            </div>
            <h2
              id="categories-heading"
              className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Explore 6 deep hardware categories
            </h2>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">
              Every category is populated with real, verified market devices,
              benchmarked across 30+ standardized hardware attributes.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-control">
            <Link to="/products">
              View all 60 models
              <ArrowRight
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_TILES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.slug}
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden rounded-card border-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-float',
                  cat.featured && 'border-primary/30 bg-card',
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-control bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon
                        className="size-5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {cat.badge}
                    </Badge>
                  </div>
                  <CardTitle className="pt-3">
                    <Link
                      to={`/products?category=${cat.slug}`}
                      className="inline-flex items-center gap-1.5 font-heading text-xl font-bold text-foreground group-hover:text-primary"
                    >
                      <span>{cat.title}</span>
                      <ArrowUpRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {cat.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Highlight pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {cat.highlights.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-border/50 pt-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Models include:{' '}
                    </span>
                    <span>{cat.sampleModels}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. LIVE TOP VALUE PICKS SHOWCASE */}
      <section
        aria-labelledby="top-value-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-foreground uppercase">
              <Flame
                className="size-4 text-accent"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span>Algorithmic Value Benchmark</span>
            </div>
            <h2
              id="top-value-heading"
              className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Top Value Picks right now
            </h2>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">
              Products scoring the highest price-to-hardware ratio across our
              entire audited catalog.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 rounded-full border border-border/80 bg-card p-1 shadow-xs">
            {[
              { id: 'all', label: 'All Picks' },
              { id: 'smartphones', label: 'Phones' },
              { id: 'laptops', label: 'Laptops' },
              { id: 'headphones', label: 'Audio' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryTab(tab.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  activeCategoryTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Product Grid */}
        <div className="mt-8">
          {productsQuery.isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </div>
          ) : showcaseProducts.length === 0 ? (
            <div className="rounded-card border border-border/60 bg-card p-10 text-center text-muted-foreground">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showcaseProducts.map((product: ProductSummary) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlist.savedIds.has(product.id)}
                  wishlistPending={
                    wishlist.isFetching || isToggling(product.id)
                  }
                  onWishlistToggle={(item) =>
                    toggleWishlist(item, !wishlist.savedIds.has(item.id))
                  }
                  isCompared={compare.selectedIds.has(product.id)}
                  compareDisabled={compare.isFull}
                  onCompareToggle={toggleCompare}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-control"
          >
            <Link to="/products">
              Explore all 60 value-ranked products
              <ArrowRight
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </section>

      {/* 5. THE THREE PILLARS (BENTO ARCHITECTURE) */}
      <section
        aria-labelledby="pillars-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
            <Zap className="size-4" strokeWidth={1.5} aria-hidden="true" />
            <span>Built Differently</span>
          </div>
          <h2
            id="pillars-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Three engines to eliminate decision fatigue
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground">
            We built Pickwise specifically for people who are exhausted by
            marketing hype, biased influencer reviews, and fragmented retailer
            spec sheets.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Pillar 1: Value Score */}
          <Card className="flex flex-col justify-between rounded-card border-border/80 bg-card p-6 shadow-xs">
            <div>
              <div className="flex size-12 items-center justify-center rounded-control bg-accent/15 text-accent-foreground">
                <TrendingUp
                  className="size-6"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 font-heading text-2xl font-bold text-foreground">
                Algorithmic Value Score
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We calculate an objective 0–100 Value Score by comparing a
                device's normalized hardware spec percentile against its price
                percentile within its category.
              </p>

              {/* Visual mini score showcase */}
              <div className="mt-6 rounded-control border border-border/60 bg-muted/40 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    OnePlus 12R 5G
                  </span>
                  <Badge className="bg-accent text-accent-foreground font-bold">
                    92 / 100
                  </Badge>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Hardware Spec Percentile</span>
                    <span className="font-mono font-medium text-foreground">
                      88th
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Bracket Position</span>
                    <span className="font-mono font-medium text-positive">
                      34th (Budget-friendly)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button asChild variant="ghost" className="p-0 text-primary">
                <Link to="/products?sort=value_desc">
                  Browse by Value Score
                  <ArrowRight
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>
          </Card>

          {/* Pillar 2: Side-by-Side Matrix */}
          <Card className="flex flex-col justify-between rounded-card border-border/80 bg-card p-6 shadow-xs">
            <div>
              <div className="flex size-12 items-center justify-center rounded-control bg-primary/10 text-primary">
                <Columns3
                  className="size-6"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 font-heading text-2xl font-bold text-foreground">
                Side-by-Side Spec Matrix
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Line up 2 to 4 products in a unified, side-by-side grid.
                Pickwise computes which model wins each individual row (RAM,
                battery life, display resolution, weight).
              </p>

              {/* Visual spec row preview */}
              <div className="mt-6 space-y-2 rounded-control border border-border/60 bg-muted/40 p-4 text-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Battery Life</span>
                  <span className="rounded bg-positive/15 px-2 py-0.5 font-semibold text-positive">
                    ✓ 5,500mAh (Winner)
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Refresh Rate</span>
                  <span className="font-mono text-foreground">120Hz LTPO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="rounded bg-positive/15 px-2 py-0.5 font-semibold text-positive">
                    ✓ 167g (Lighter)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button asChild variant="ghost" className="p-0 text-primary">
                <Link to="/compare">
                  Open Comparison Tool
                  <ArrowRight
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>
          </Card>

          {/* Pillar 3: Grounded Assistant */}
          <Card className="flex flex-col justify-between rounded-card border-border/80 bg-card p-6 shadow-xs">
            <div>
              <div className="flex size-12 items-center justify-center rounded-control bg-secondary text-foreground">
                <MessageSquareText
                  className="size-6 text-accent"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 font-heading text-2xl font-bold text-foreground">
                Budget-Grounded AI
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Unlike generic LLMs that invent fake model names or recommend
                over-budget hardware, our assistant strictly searches real
                database catalog items.
              </p>

              {/* Chat snippet preview */}
              <div className="mt-6 space-y-2 rounded-control border border-border/60 bg-muted/40 p-4 text-xs">
                <div className="rounded-control bg-card p-2 text-foreground shadow-xs">
                  "I need an ultrabook for coding with 32GB RAM under ₹85,000"
                </div>
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Sparkles className="size-3 text-accent" />
                  <span>
                    Found 2 exact matches in budget · Zero over-budget
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button asChild variant="ghost" className="p-0 text-primary">
                <Link to="/assistant">
                  Chat with the Assistant
                  <ArrowRight
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. COMPARISON TABLE: PICKWISE VS THE REST */}
      <section
        aria-labelledby="comparison-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
            <ShieldCheck
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>The Anti-Noise Difference</span>
          </div>
          <h2
            id="comparison-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Why shoppers use Pickwise instead of retail search
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground">
            Online shopping has become a maze of paid placements, fake reviews,
            and hidden trade-offs. Here is how Pickwise restores sanity.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-surface border border-border/80 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/50 text-xs font-semibold text-foreground uppercase">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Shopping Dimension
                  </th>
                  <th scope="col" className="px-6 py-4 text-muted-foreground">
                    Traditional Search & Marketplaces
                  </th>
                  <th
                    scope="col"
                    className="bg-primary/10 px-6 py-4 text-primary"
                  >
                    Pickwise Decision Tool
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 font-semibold text-foreground"
                    >
                      {row.feature}
                    </th>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle
                          className="size-4 shrink-0 text-destructive/70"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <span>{row.traditional}</span>
                      </div>
                    </td>
                    <td className="bg-primary/5 px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className="size-4 shrink-0 text-positive"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <span>{row.pickwise}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS WORKFLOW */}
      <section
        aria-labelledby="how-it-works-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
            <Layers className="size-4" strokeWidth={1.5} aria-hidden="true" />
            <span>4-Step Decision Flow</span>
          </div>
          <h2
            id="how-it-works-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            How Pickwise does the homework for you
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground">
            From initial requirements to final checkout confidence in under five
            minutes.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative flex flex-col justify-between rounded-card border border-border/80 bg-card p-6 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">
                      STEP {s.step}
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-control bg-primary/10 text-primary">
                      <Icon
                        className="size-4"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. BOTTOM HIGH-IMPACT CONVERSION CTA */}
      <section
        aria-labelledby="cta-heading"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="relative overflow-hidden rounded-surface border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 p-8 sm:p-12 lg:p-16 shadow-float text-center">
          {/* Ambient decorative glow */}
          <div
            className="pointer-events-none absolute -bottom-20 left-1/2 -z-10 h-72 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
            aria-hidden="true"
          />

          <Badge
            variant="outline"
            className="mb-4 gap-1.5 border-primary/30 bg-primary/5 text-primary"
          >
            <Sparkles className="size-3 text-accent" aria-hidden="true" />
            100% Free · No sign-up required to search
          </Badge>

          <h2
            id="cta-heading"
            className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Ready to find your next pick without the headache?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-muted-foreground">
            Explore audited devices across 6 categories, line up your top
            choices in the spec matrix, and get honest AI verdicts today.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-control">
              <Link to="/products">
                Browse Full Catalog
                <ArrowRight
                  className="size-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-control"
            >
              <Link to="/compare">
                <Columns3
                  className="size-4 text-primary"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Try Side-by-Side Compare
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="rounded-control"
            >
              <Link to="/assistant">Ask the Assistant</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
