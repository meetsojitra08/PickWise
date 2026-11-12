<?php

declare(strict_types=1);

namespace Database\Seeders\Catalog;

use Illuminate\Contracts\Filesystem\Filesystem;

/**
 * Generates deterministic, copyright-free SVG placeholder artwork on the public storage disk.
 */
final class CatalogMediaGenerator
{
    public function __construct(
        private readonly Filesystem $disk,
    ) {}

    public function putCategoryImage(string $slug, string $name): string
    {
        $path = "categories/{$slug}.svg";
        $escapedName = $this->escape($name);
        $motif = $this->categorySilhouette($slug, 480, 120, '#0F5E5A', '#F2B134');

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="800" height="480" role="img" aria-label="{$escapedName}">
  <rect width="800" height="480" rx="24" fill="#F6F7F5"/>
  <rect x="24" y="24" width="752" height="432" rx="16" fill="#FFFFFF" stroke="#E2E6E3" stroke-width="2"/>
  <rect x="56" y="72" width="64" height="6" rx="3" fill="#0F5E5A"/>
  <text x="56" y="132" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="700" fill="#17212B">{$escapedName}</text>
  <text x="56" y="172" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#5B6773">Pickwise verified catalog category</text>
  {$motif}
</svg>
SVG;

        $this->disk->put($path, $svg."\n");

        return $path;
    }

    public function putBrandLogo(string $slug, string $name): string
    {
        $path = "brands/{$slug}.svg";
        $escapedName = $this->escape($name);
        $initials = $this->escape($this->initials($name));

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80" role="img" aria-label="{$escapedName}">
  <rect width="240" height="80" rx="14" fill="#FFFFFF" stroke="#E2E6E3" stroke-width="2"/>
  <circle cx="44" cy="40" r="20" fill="#0F5E5A"/>
  <text x="44" y="46" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">{$initials}</text>
  <text x="78" y="47" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#17212B">{$escapedName}</text>
</svg>
SVG;

        $this->disk->put($path, $svg."\n");

        return $path;
    }

    /**
     * Generate two deterministic gallery views for a seeded product and return their metadata.
     *
     * @return list<array{path: string, alt_text: string, sort_order: int, is_primary: bool}>
     */
    public function putProductGallery(
        string $categorySlug,
        string $productSlug,
        string $productName,
        string $brandName,
    ): array {
        $primaryPath = "products/{$productSlug}/front.svg";
        $overviewPath = "products/{$productSlug}/overview.svg";

        $this->disk->put(
            $primaryPath,
            $this->buildProductSvg($categorySlug, $productName, $brandName, false)."\n",
        );

        $this->disk->put(
            $overviewPath,
            $this->buildProductSvg($categorySlug, $productName, $brandName, true)."\n",
        );

        return [
            [
                'path' => $primaryPath,
                'alt_text' => "{$productName} front view",
                'sort_order' => 0,
                'is_primary' => true,
            ],
            [
                'path' => $overviewPath,
                'alt_text' => "{$productName} hardware overview",
                'sort_order' => 1,
                'is_primary' => false,
            ],
        ];
    }

    private function buildProductSvg(
        string $categorySlug,
        string $productName,
        string $brandName,
        bool $isOverview,
    ): string {
        $escapedProduct = $this->escape($productName);
        $escapedBrand = $this->escape($brandName);
        $subtitle = $isOverview ? 'Hardware &amp; spec angle' : 'Primary product view';
        $surface = $isOverview ? '#EFF3F1' : '#F6F7F5';
        $primary = $isOverview ? '#17212B' : '#0F5E5A';
        $accent = '#F2B134';
        $motif = $this->categorySilhouette($categorySlug, 280, 120, $primary, $accent);

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="{$escapedProduct}">
  <rect width="800" height="600" rx="20" fill="{$surface}"/>
  <rect x="32" y="32" width="736" height="536" rx="16" fill="#FFFFFF" stroke="#E2E6E3" stroke-width="2"/>
  <rect x="64" y="64" width="140" height="32" rx="16" fill="{$primary}"/>
  <text x="134" y="85" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF">{$escapedBrand}</text>
  {$motif}
  <text x="400" y="476" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="#17212B">{$escapedProduct}</text>
  <text x="400" y="510" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#5B6773">{$subtitle}</text>
</svg>
SVG;
    }

    private function categorySilhouette(
        string $categorySlug,
        int $x,
        int $y,
        string $primary,
        string $accent,
    ): string {
        return match ($categorySlug) {
            'smartphones' => <<<SVG
  <g transform="translate({$x}, {$y})">
    <rect x="44" y="10" width="152" height="260" rx="24" fill="{$primary}" opacity="0.12" stroke="{$primary}" stroke-width="4"/>
    <rect x="58" y="30" width="124" height="214" rx="14" fill="#FFFFFF" stroke="{$primary}" stroke-width="2"/>
    <rect x="96" y="18" width="48" height="6" rx="3" fill="{$primary}"/>
    <circle cx="88" cy="64" r="14" fill="{$accent}"/>
    <circle cx="88" cy="100" r="10" fill="{$primary}" opacity="0.5"/>
  </g>
SVG,
            'laptops' => <<<SVG
  <g transform="translate({$x}, {$y})">
    <rect x="16" y="36" width="208" height="140" rx="12" fill="{$primary}" opacity="0.12" stroke="{$primary}" stroke-width="4"/>
    <rect x="30" y="50" width="180" height="112" rx="6" fill="#FFFFFF" stroke="{$primary}" stroke-width="2"/>
    <path d="M0 192 H240 L226 214 H14 Z" fill="{$primary}"/>
    <rect x="94" y="198" width="52" height="6" rx="3" fill="{$accent}"/>
  </g>
SVG,
            'headphones' => <<<SVG
  <g transform="translate({$x}, {$y})">
    <path d="M44 150 V120 C44 64 78 34 120 34 C162 34 196 64 196 120 V150" fill="none" stroke="{$primary}" stroke-width="12" stroke-linecap="round"/>
    <rect x="26" y="132" width="38" height="86" rx="18" fill="{$primary}"/>
    <rect x="176" y="132" width="38" height="86" rx="18" fill="{$primary}"/>
    <circle cx="45" cy="175" r="9" fill="{$accent}"/>
    <circle cx="195" cy="175" r="9" fill="{$accent}"/>
  </g>
SVG,
            'monitors' => <<<SVG
  <g transform="translate({$x}, {$y})">
    <rect x="8" y="26" width="224" height="146" rx="10" fill="{$primary}" opacity="0.12" stroke="{$primary}" stroke-width="4"/>
    <rect x="22" y="40" width="196" height="118" rx="4" fill="#FFFFFF" stroke="{$primary}" stroke-width="2"/>
    <rect x="106" y="172" width="28" height="36" fill="{$primary}"/>
    <rect x="70" y="208" width="100" height="12" rx="6" fill="{$accent}"/>
  </g>
SVG,
            'keyboards' => <<<SVG
  <g transform="translate({$x}, {$y})">
    <rect x="6" y="68" width="228" height="118" rx="14" fill="{$primary}" opacity="0.12" stroke="{$primary}" stroke-width="4"/>
    <rect x="24" y="88" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="56" y="88" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="88" y="88" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="120" y="88" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="152" y="88" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="184" y="88" width="32" height="20" rx="4" fill="{$accent}"/>
    <rect x="24" y="118" width="32" height="20" rx="4" fill="{$primary}"/>
    <rect x="64" y="118" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="96" y="118" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="128" y="118" width="24" height="20" rx="4" fill="{$primary}"/>
    <rect x="160" y="118" width="56" height="20" rx="4" fill="{$primary}"/>
    <rect x="64" y="148" width="112" height="18" rx="4" fill="{$primary}"/>
  </g>
SVG,
            default => <<<SVG
  <g transform="translate({$x}, {$y})">
    <rect x="92" y="12" width="56" height="44" rx="10" fill="{$primary}" opacity="0.45"/>
    <rect x="92" y="204" width="56" height="44" rx="10" fill="{$primary}" opacity="0.45"/>
    <rect x="58" y="50" width="124" height="160" rx="28" fill="{$primary}" opacity="0.14" stroke="{$primary}" stroke-width="4"/>
    <rect x="74" y="68" width="92" height="124" rx="18" fill="#FFFFFF" stroke="{$primary}" stroke-width="2"/>
    <circle cx="120" cy="130" r="24" fill="none" stroke="{$accent}" stroke-width="6"/>
  </g>
SVG,
        };
    }

    private function initials(string $name): string
    {
        $words = preg_split('/[\s-]+/', trim($name)) ?: [];
        $letters = '';

        foreach ($words as $word) {
            if ($word !== '') {
                $letters .= strtoupper(substr($word, 0, 1));
            }
            if (strlen($letters) >= 2) {
                break;
            }
        }

        return $letters !== '' ? $letters : 'PW';
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
