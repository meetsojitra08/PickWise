<?php

declare(strict_types=1);

namespace Database\Seeders\Catalog;

use Illuminate\Contracts\Filesystem\Filesystem;

/**
 * Generates photorealistic, brand-accurate SVG showcase product artwork and brand/category media.
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
     * Generate two deterministic, model-accurate gallery views for a seeded product and return their metadata.
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
            $this->buildProductSvg($categorySlug, $productSlug, $productName, $brandName, false)."\n",
        );

        $this->disk->put(
            $overviewPath,
            $this->buildProductSvg($categorySlug, $productSlug, $productName, $brandName, true)."\n",
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
        string $productSlug,
        string $productName,
        string $brandName,
        bool $isOverview,
    ): string {
        $escapedProduct = $this->escape($productName);
        $escapedBrand = $this->escape($brandName);
        $angleLabel = $isOverview ? 'Hardware Overview' : 'Front View';

        $hardwareSvg = match ($categorySlug) {
            'smartphones' => $this->renderSmartphoneSvg($productSlug, $escapedProduct, $escapedBrand, $isOverview),
            'laptops' => $this->renderLaptopSvg($productSlug, $escapedProduct, $escapedBrand, $isOverview),
            'headphones' => $this->renderHeadphonesSvg($productSlug, $escapedProduct, $escapedBrand, $isOverview),
            'monitors' => $this->renderMonitorSvg($productSlug, $escapedProduct, $escapedBrand, $isOverview),
            'keyboards' => $this->renderKeyboardSvg($productSlug, $escapedProduct, $escapedBrand, $isOverview),
            'smartwatches' => $this->renderSmartwatchSvg($productSlug, $escapedProduct, $escapedBrand, $isOverview),
            default => $this->renderFallbackSvg($categorySlug, $escapedProduct, $escapedBrand, $isOverview),
        };

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="{$escapedProduct} {$angleLabel}">
  <defs>
    <radialGradient id="pw-canvas-bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="60%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#F1F5F9"/>
    </radialGradient>
    <filter id="pw-shadow" x="-20%" y="-15%" width="140%" height="135%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0F172A" flood-opacity="0.14"/>
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.06"/>
    </filter>
  </defs>

  <!-- Studio backdrop -->
  <rect width="800" height="600" rx="20" fill="url(#pw-canvas-bg)"/>
  <rect x="18" y="18" width="764" height="564" rx="16" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>

  <!-- Brand pill top-left -->
  <g transform="translate(42, 38)">
    <rect width="84" height="26" rx="13" fill="#0F172A" fill-opacity="0.05" stroke="#E2E8F0" stroke-width="1"/>
    <text x="42" y="17" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#334155">{$escapedBrand}</text>
  </g>

  <!-- View angle badge top-right -->
  <g transform="translate(620, 38)">
    <rect width="138" height="26" rx="13" fill="#0F172A" fill-opacity="0.04"/>
    <text x="69" y="17" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748B">{$angleLabel}</text>
  </g>

  <!-- Ground reflection -->
  <ellipse cx="400" cy="515" rx="230" ry="22" fill="#0F172A" fill-opacity="0.07" filter="blur(16px)"/>

  <!-- Centered product render -->
  {$hardwareSvg}

  <!-- Bottom product label -->
  <text x="400" y="558" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#1E293B">{$escapedProduct}</text>
</svg>
SVG;
    }

    private function renderSmartphoneSvg(string $slug, string $name, string $brand, bool $isOverview): string
    {
        $isIphone = str_contains($slug, 'iphone');
        $isPixel = str_contains($slug, 'pixel');
        $isNothing = str_contains($slug, 'nothing') || str_contains($slug, 'cmf');
        $isCmf = str_contains($slug, 'cmf');
        $isSamsung = str_contains($slug, 'samsung') || str_contains($slug, 'galaxy');
        $isOneplus = str_contains($slug, 'oneplus');
        $isXiaomi = str_contains($slug, 'xiaomi');

        $frameFill = match (true) {
            $isIphone => '#A69F94', // Natural Titanium
            $isPixel && str_contains($slug, '8a') => '#4F7DA3', // Bay Blue
            $isPixel => '#3A3F45', // Obsidian/Hazel
            $isCmf => '#E85923', // CMF Orange
            $isNothing => '#262A30', // Nothing Dark Slate
            $isSamsung && str_contains($slug, 's24') => '#3B3E45', // Onyx Black
            $isSamsung => '#394657', // Awesome Navy
            $isOneplus && str_contains($slug, 'nord') => '#727885', // Mercurial Silver
            $isOneplus => '#2D5449', // Emerald Green
            $isXiaomi => '#415745', // Matcha Olive
            default => '#334155',
        };

        $backFill = match (true) {
            $isIphone => '#C5BFB5', // Desert / Natural Titanium frosted glass
            $isPixel && str_contains($slug, '8a') => '#5E97C2',
            $isPixel => '#E8E5DF', // Porcelain
            $isCmf => '#FF6B2B', // CMF textured orange
            $isNothing => '#1E2227', // Transparent smoked glass
            $isSamsung && str_contains($slug, 's24') => '#4A4E58',
            $isSamsung => '#45566C',
            $isOneplus && str_contains($slug, 'nord') => '#8C92A0',
            $isOneplus => '#3D6B5D',
            $isXiaomi => '#536D58',
            default => '#475569',
        };

        if ($isOverview) {
            // REAR HARDWARE OVERVIEW VIEW
            $cameraDetails = '';

            if ($isIphone) {
                // iPhone 16 Pro Triple Sapphire Lens Plateau & Apple Logo
                $cameraDetails = <<<'SVG'
    <!-- Frosted Camera Island -->
    <rect x="25" y="25" width="105" height="110" rx="28" fill="#B2ACA0" stroke="#8F897E" stroke-width="2"/>
    <!-- Top-Left Lens -->
    <circle cx="55" cy="55" r="22" fill="#7D776E" stroke="#5E584F" stroke-width="2.5"/>
    <circle cx="55" cy="55" r="14" fill="#121824"/>
    <circle cx="55" cy="55" r="6" fill="#1E3A8A" opacity="0.6"/>
    <!-- Bottom-Left Lens -->
    <circle cx="55" cy="105" r="22" fill="#7D776E" stroke="#5E584F" stroke-width="2.5"/>
    <circle cx="55" cy="105" r="14" fill="#121824"/>
    <circle cx="55" cy="105" r="6" fill="#1E3A8A" opacity="0.6"/>
    <!-- Right Telephoto Lens -->
    <circle cx="102" cy="80" r="22" fill="#7D776E" stroke="#5E584F" stroke-width="2.5"/>
    <circle cx="102" cy="80" r="14" fill="#121824"/>
    <circle cx="102" cy="80" r="6" fill="#1E3A8A" opacity="0.6"/>
    <!-- Flash & LiDAR -->
    <circle cx="98" cy="46" r="7" fill="#FEF08A" stroke="#E2E8F0" stroke-width="1.5"/>
    <circle cx="98" cy="114" r="5" fill="#0A0E17"/>
    <!-- Apple Centered Logo -->
    <circle cx="110" cy="235" r="16" fill="#7D776E" opacity="0.4"/>
SVG;
            } elseif ($isPixel) {
                // Google Pixel Iconic Horizontal Camera Visor
                $cameraDetails = <<<'SVG'
    <!-- Horizontal Camera Visor Bar -->
    <rect x="0" y="55" width="220" height="64" rx="14" fill="#1E232A" stroke="#4B5563" stroke-width="2"/>
    <rect x="24" y="68" width="100" height="38" rx="19" fill="#090D14"/>
    <circle cx="50" cy="87" r="13" fill="#020617"/>
    <circle cx="50" cy="87" r="5" fill="#1E3A8A" opacity="0.7"/>
    <circle cx="92" cy="87" r="13" fill="#020617"/>
    <circle cx="92" cy="87" r="5" fill="#1E3A8A" opacity="0.7"/>
    <!-- Flash -->
    <circle cx="175" cy="87" r="9" fill="#FEF08A"/>
    <!-- Google G Logo -->
    <circle cx="110" cy="245" r="15" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.5"/>
SVG;
            } elseif ($isNothing && ! $isCmf) {
                // Nothing Phone (2a) Transparent back with centered "eyes" and Glyphs
                $cameraDetails = <<<'SVG'
    <!-- Upper Coil & Central Dual Cameras ("The Eyes") -->
    <circle cx="110" cy="95" r="55" fill="none" stroke="#475569" stroke-width="3" stroke-dasharray="8 6"/>
    <rect x="68" y="76" width="84" height="38" rx="19" fill="#090D14" stroke="#64748B" stroke-width="2"/>
    <circle cx="89" cy="95" r="13" fill="#020617"/>
    <circle cx="89" cy="95" r="5" fill="#38BDF8" opacity="0.7"/>
    <circle cx="131" cy="95" r="13" fill="#020617"/>
    <circle cx="131" cy="95" r="5" fill="#38BDF8" opacity="0.7"/>
    <!-- Glyph LED Light Bars -->
    <path d="M42 65 C42 40 80 32 110 32" fill="none" stroke="#F8FAFC" stroke-width="5" stroke-linecap="round"/>
    <path d="M125 32 C155 35 178 50 178 72" fill="none" stroke="#F8FAFC" stroke-width="5" stroke-linecap="round"/>
    <path d="M110 160 C155 160 178 140 178 118" fill="none" stroke="#F8FAFC" stroke-width="5" stroke-linecap="round"/>
    <!-- Lower ribbon cables -->
    <path d="M70 170 C70 260 150 280 150 370" fill="none" stroke="#475569" stroke-width="4"/>
    <path d="M85 170 C85 245 135 270 135 370" fill="none" stroke="#334155" stroke-width="3"/>
SVG;
            } elseif ($isCmf) {
                // CMF Phone 1 Modular Back with 4 Exposed Screws & Accessory Dial
                $cameraDetails = <<<'SVG'
    <!-- 4 Exposed Corner Screws -->
    <circle cx="20" cy="20" r="5" fill="#CBD5E1" stroke="#334155" stroke-width="1.5"/>
    <circle cx="200" cy="20" r="5" fill="#CBD5E1" stroke="#334155" stroke-width="1.5"/>
    <circle cx="20" cy="410" r="5" fill="#CBD5E1" stroke="#334155" stroke-width="1.5"/>
    <!-- Vertical Dual Camera Pill -->
    <rect x="22" y="45" width="38" height="74" rx="19" fill="#1E232A" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="41" cy="64" r="12" fill="#020617"/>
    <circle cx="41" cy="100" r="12" fill="#020617"/>
    <!-- Bottom Right Accessory Dial -->
    <circle cx="185" cy="385" r="22" fill="#1E232A" stroke="#94A3B8" stroke-width="3"/>
    <circle cx="185" cy="385" r="14" fill="#334155"/>
    <circle cx="185" cy="385" r="6" fill="#E2E8F0"/>
SVG;
            } elseif ($isSamsung) {
                // Samsung Galaxy 3 Floating Vertical Camera Lenses
                $cameraDetails = <<<'SVG'
    <!-- 3 Individual Floating Lenses -->
    <circle cx="45" cy="55" r="18" fill="#1E232A" stroke="#94A3B8" stroke-width="3"/>
    <circle cx="45" cy="55" r="10" fill="#020617"/>
    <circle cx="45" cy="105" r="18" fill="#1E232A" stroke="#94A3B8" stroke-width="3"/>
    <circle cx="45" cy="105" r="10" fill="#020617"/>
    <circle cx="45" cy="155" r="18" fill="#1E232A" stroke="#94A3B8" stroke-width="3"/>
    <circle cx="45" cy="155" r="10" fill="#020617"/>
    <circle cx="82" cy="55" r="5" fill="#FEF08A"/>
    <!-- Samsung Logo -->
    <text x="110" y="390" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#E2E8F0" opacity="0.6">SAMSUNG</text>
SVG;
            } elseif ($isXiaomi || ($isOneplus && ! str_contains($slug, 'nord'))) {
                // Large Circular Camera Dial (Xiaomi 14 Civi / OnePlus 12R)
                $cameraDetails = <<<'SVG'
    <circle cx="110" cy="105" r="50" fill="#1E232A" stroke="#CBD5E1" stroke-width="3"/>
    <circle cx="110" cy="105" r="44" fill="#090D16"/>
    <circle cx="92" cy="90" r="13" fill="#020617" stroke="#64748B" stroke-width="1.5"/>
    <circle cx="128" cy="90" r="13" fill="#020617" stroke="#64748B" stroke-width="1.5"/>
    <circle cx="110" cy="126" r="13" fill="#020617" stroke="#64748B" stroke-width="1.5"/>
    <circle cx="132" cy="126" r="4" fill="#FEF08A"/>
SVG;
            } else {
                // Dual/Triple camera standard module
                $cameraDetails = <<<'SVG'
    <rect x="22" y="35" width="46" height="95" rx="20" fill="#1E232A" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="45" cy="58" r="14" fill="#020617"/>
    <circle cx="45" cy="98" r="14" fill="#020617"/>
SVG;
            }

            return <<<SVG
  <g transform="translate(290, 68)" filter="url(#pw-shadow)">
    <!-- Phone Chassis -->
    <rect x="0" y="0" width="220" height="430" rx="38" fill="{$frameFill}"/>
    <!-- Rear Glass Panel -->
    <rect x="4" y="4" width="212" height="422" rx="34" fill="{$backFill}"/>
    {$cameraDetails}
  </g>
SVG;
        }

        // FRONT SCREEN VIEW
        $notchOrIsland = '';
        if ($isIphone) {
            // Dynamic Island
            $notchOrIsland = <<<'SVG'
    <!-- Dynamic Island -->
    <rect x="74" y="16" width="72" height="20" rx="10" fill="#000000"/>
    <circle cx="130" cy="26" r="4.5" fill="#0B132B"/>
    <circle cx="130" cy="26" r="2" fill="#1D4ED8" opacity="0.6"/>
    <circle cx="96" cy="26" r="4" fill="#050811"/>
SVG;
        } else {
            // Centered Punch-Hole Camera
            $notchOrIsland = <<<'SVG'
    <circle cx="110" cy="24" r="5" fill="#000000"/>
    <circle cx="110" cy="24" r="2.5" fill="#1E293B"/>
    <circle cx="110" cy="24" r="1" fill="#38BDF8" opacity="0.6"/>
SVG;
        }

        return <<<SVG
  <g transform="translate(290, 68)" filter="url(#pw-shadow)">
    <!-- Side Hardware Buttons -->
    <rect x="-3" y="95" width="3" height="26" rx="1.5" fill="{$frameFill}"/>
    <rect x="-3" y="130" width="3" height="46" rx="1.5" fill="{$frameFill}"/>
    <rect x="-3" y="185" width="3" height="46" rx="1.5" fill="{$frameFill}"/>
    <rect x="220" y="140" width="3" height="65" rx="1.5" fill="{$frameFill}"/>

    <!-- Outer Phone Chassis -->
    <rect x="0" y="0" width="220" height="430" rx="38" fill="{$frameFill}"/>

    <!-- Ultra-Thin Black Display Bezel -->
    <rect x="4" y="4" width="212" height="422" rx="34" fill="#000000"/>

    <!-- Active OLED Display Area with Gradient Wallpaper -->
    <rect x="7" y="7" width="206" height="416" rx="31" fill="#0F172A"/>
    <path d="M7 260 C70 180 140 320 213 220 L213 423 L7 423 Z" fill="{$frameFill}" opacity="0.35"/>

    <!-- Status Bar & Time -->
    <text x="110" y="76" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF" fill-opacity="0.95">9:41</text>
    <text x="110" y="98" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#E2E8F0" fill-opacity="0.8">Wed, Sep 18</text>

    <!-- Camera / Island -->
    {$notchOrIsland}

    <!-- Bottom Home Indicator -->
    <rect x="75" y="408" width="70" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.55"/>
  </g>
SVG;
    }

    private function renderLaptopSvg(string $slug, string $name, string $brand, bool $isOverview): string
    {
        $isMac = str_contains($slug, 'macbook') || str_contains($slug, 'apple');
        $isGaming = str_contains($slug, 'gaming') || str_contains($slug, 'tuf');
        $isSilver = str_contains($slug, 'dell') || str_contains($slug, 'hp') || str_contains($slug, 'air');

        $bodyColor = match (true) {
            $isMac && str_contains($slug, 'm4') => '#1C1D21', // Space Black
            $isMac => '#6E737B', // Space Gray
            $isGaming => '#2E3238', // Mecha Gray
            $isSilver => '#CBD5E1', // Platinum Silver
            default => '#475569', // Dark Slate
        };

        if ($isOverview) {
            // CLOSED LAPTOP TOP-DOWN / HARDWARE ANGLE
            $logo = match (true) {
                $isMac => '<circle cx="250" cy="150" r="18" fill="#FFFFFF" opacity="0.85"/>',
                str_contains($slug, 'dell') => '<circle cx="250" cy="150" r="22" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.8"/><text x="250" y="155" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#FFFFFF" opacity="0.8">DELL</text>',
                $isGaming => '<path d="M235 135 H265 L260 165 L250 172 L240 165 Z" fill="#F59E0B" opacity="0.9"/>',
                default => '<rect x="220" y="142" width="60" height="16" rx="4" fill="#FFFFFF" opacity="0.6"/>',
            };

            return <<<SVG
  <g transform="translate(150, 110)" filter="url(#pw-shadow)">
    <!-- Closed Lid Surface -->
    <rect x="0" y="0" width="500" height="320" rx="14" fill="{$bodyColor}" stroke="#334155" stroke-width="2"/>
    <!-- Edge Highlight -->
    <rect x="4" y="4" width="492" height="312" rx="11" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.15"/>
    <!-- Hinge Bar -->
    <rect x="40" y="316" width="420" height="12" rx="3" fill="#0F172A"/>
    <!-- Ports Visible on Edge -->
    <rect x="-4" y="80" width="4" height="8" rx="2" fill="#0F172A"/>
    <rect x="-4" y="105" width="4" height="8" rx="2" fill="#0F172A"/>
    {$logo}
  </g>
SVG;
        }

        // OPEN LAPTOP WORKSPACE VIEW
        $notch = $isMac ? '<rect x="238" y="10" width="24" height="10" rx="4" fill="#000000"/>' : '<circle cx="250" cy="14" r="3" fill="#1E293B"/>';
        $screenWallpaper = $isMac ? '#1E1B4B' : ($isGaming ? '#450A0A' : '#0F172A');
        $wasdColor = $isGaming ? '#F59E0B' : '#1E293B';

        return <<<SVG
  <g transform="translate(140, 80)" filter="url(#pw-shadow)">
    <!-- Upper Lid / Screen -->
    <g transform="translate(20, 0)">
      <rect x="0" y="0" width="480" height="280" rx="10" fill="{$bodyColor}"/>
      <rect x="8" y="8" width="464" height="264" rx="4" fill="#000000"/>
      <!-- Active Display -->
      <rect x="12" y="12" width="456" height="256" rx="2" fill="{$screenWallpaper}"/>
      <!-- Vibrant Desktop Wallpaper Curve -->
      <path d="M12 200 C150 120 300 240 468 150 L468 268 L12 268 Z" fill="{$bodyColor}" opacity="0.35"/>
      {$notch}
    </g>

    <!-- Lower Chassis / Keyboard Deck -->
    <path d="M0 280 L520 280 L500 410 L20 410 Z" fill="{$bodyColor}"/>
    <rect x="50" y="290" width="420" height="70" rx="6" fill="#0F172A"/>

    <!-- Keycaps Matrix -->
    <g fill="#1E293B" stroke="#0F172A" stroke-width="1">
      <!-- Function Row -->
      <rect x="58" y="294" width="22" height="9" rx="2"/>
      <rect x="84" y="294" width="22" height="9" rx="2"/>
      <rect x="110" y="294" width="22" height="9" rx="2"/>
      <rect x="136" y="294" width="22" height="9" rx="2"/>
      <rect x="162" y="294" width="22" height="9" rx="2"/>
      <rect x="188" y="294" width="22" height="9" rx="2"/>
      <rect x="214" y="294" width="22" height="9" rx="2"/>
      <rect x="240" y="294" width="22" height="9" rx="2"/>
      <rect x="266" y="294" width="22" height="9" rx="2"/>
      <rect x="292" y="294" width="22" height="9" rx="2"/>
      <rect x="318" y="294" width="22" height="9" rx="2"/>
      <rect x="344" y="294" width="22" height="9" rx="2"/>
      <rect x="370" y="294" width="22" height="9" rx="2"/>
      <rect x="396" y="294" width="22" height="9" rx="2"/>
      <rect x="422" y="294" width="40" height="9" rx="2"/>

      <!-- Main QWERTY Keys -->
      <rect x="58" y="306" width="30" height="11" rx="2"/>
      <rect x="91" y="306" width="24" height="11" rx="2" fill="{$wasdColor}"/>
      <rect x="118" y="306" width="24" height="11" rx="2" fill="{$wasdColor}"/>
      <rect x="145" y="306" width="24" height="11" rx="2" fill="{$wasdColor}"/>
      <rect x="172" y="306" width="24" height="11" rx="2"/>
      <rect x="199" y="306" width="24" height="11" rx="2"/>
      <rect x="226" y="306" width="24" height="11" rx="2"/>
      <rect x="253" y="306" width="24" height="11" rx="2"/>
      <rect x="280" y="306" width="24" height="11" rx="2"/>
      <rect x="307" y="306" width="24" height="11" rx="2"/>
      <rect x="334" y="306" width="24" height="11" rx="2"/>
      <rect x="361" y="306" width="24" height="11" rx="2"/>
      <rect x="388" y="306" width="74" height="11" rx="2"/>

      <!-- Spacebar Row -->
      <rect x="58" y="342" width="40" height="12" rx="2"/>
      <rect x="101" y="342" width="35" height="12" rx="2"/>
      <rect x="139" y="342" width="180" height="12" rx="2"/>
      <rect x="322" y="342" width="40" height="12" rx="2"/>
      <rect x="365" y="342" width="40" height="12" rx="2"/>
      <rect x="408" y="342" width="54" height="12" rx="2"/>
    </g>

    <!-- Glass Trackpad -->
    <rect x="200" y="366" width="120" height="38" rx="5" fill="none" stroke="#94A3B8" stroke-width="1.5" opacity="0.6"/>
  </g>
SVG;
    }

    private function renderHeadphonesSvg(string $slug, string $name, string $brand, bool $isOverview): string
    {
        $isInEar = str_contains($slug, 'buds') || str_contains($slug, 'wf-c') || str_contains($slug, 'ear-a');
        $isAirpodsMax = str_contains($slug, 'airpods');
        $isSonyWh = str_contains($slug, 'wh-1000') || str_contains($slug, 'wh-ch');
        $isBose = str_contains($slug, 'bose');
        $isSennheiserHd = str_contains($slug, 'hd-560');

        $headphoneColor = match (true) {
            $isAirpodsMax => '#E2E8F0', // Silver / Anodized Aluminum
            str_contains($slug, 'ear-a') => '#FACC15', // Nothing Yellow
            $isSonyWh && str_contains($slug, 'xm5') => '#1E2024', // Matte Black with gold
            default => '#2D3748',
        };

        if ($isInEar) {
            // TWS EARBUDS & CASE
            return <<<SVG
  <g transform="translate(260, 110)" filter="url(#pw-shadow)">
    <!-- Pebble Charging Case -->
    <rect x="50" y="160" width="180" height="130" rx="55" fill="{$headphoneColor}" stroke="#4A5568" stroke-width="2"/>
    <line x1="50" y1="215" x2="230" y2="215" stroke="#1A202C" stroke-width="2"/>
    <circle cx="140" cy="235" r="4" fill="#22C55E"/>

    <!-- Left Earbud Resting Outside -->
    <g transform="translate(10, 40)">
      <circle cx="35" cy="40" r="22" fill="#1A202C"/>
      <rect x="30" y="55" width="10" height="45" rx="5" fill="{$headphoneColor}"/>
      <circle cx="22" cy="40" r="12" fill="#E2E8F0"/>
    </g>

    <!-- Right Earbud Resting Outside -->
    <g transform="translate(200, 40)">
      <circle cx="35" cy="40" r="22" fill="#1A202C"/>
      <rect x="30" y="55" width="10" height="45" rx="5" fill="{$headphoneColor}"/>
      <circle cx="48" cy="40" r="12" fill="#E2E8F0"/>
    </g>
  </g>
SVG;
        }

        // OVER-EAR HEADPHONES (Sony XM5, AirPods Max, Bose Ultra, Sennheiser)
        $earcupDetail = match (true) {
            $isAirpodsMax => '<rect x="68" y="210" width="74" height="120" rx="37" fill="#CBD5E1" stroke="#94A3B8" stroke-width="2.5"/><rect x="258" y="210" width="74" height="120" rx="37" fill="#CBD5E1" stroke="#94A3B8" stroke-width="2.5"/>',
            $isSennheiserHd => '<ellipse cx="105" cy="270" rx="42" ry="65" fill="#1E293B" stroke="#475569" stroke-width="3"/><ellipse cx="105" cy="270" rx="30" ry="50" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 3"/><ellipse cx="295" cy="270" rx="42" ry="65" fill="#1E293B" stroke="#475569" stroke-width="3"/><ellipse cx="295" cy="270" rx="30" ry="50" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 3"/>',
            default => '<ellipse cx="105" cy="270" rx="44" ry="66" fill="#1E2024" stroke="#4A5568" stroke-width="2.5"/><circle cx="105" cy="270" r="8" fill="#F59E0B" opacity="0.6"/><ellipse cx="295" cy="270" rx="44" ry="66" fill="#1E2024" stroke="#4A5568" stroke-width="2.5"/><circle cx="295" cy="270" r="8" fill="#F59E0B" opacity="0.6"/>',
        };

        return <<<SVG
  <g transform="translate(200, 75)" filter="url(#pw-shadow)">
    <!-- Padded Headband Arch -->
    <path d="M105 240 C105 100 295 100 295 240" fill="none" stroke="{$headphoneColor}" stroke-width="24" stroke-linecap="round"/>
    <path d="M115 220 C115 115 285 115 285 220" fill="none" stroke="#1A202C" stroke-width="12" stroke-linecap="round"/>

    <!-- Left & Right Telescoping Slider Arms -->
    <rect x="98" y="200" width="14" height="40" rx="4" fill="#94A3B8"/>
    <rect x="288" y="200" width="14" height="40" rx="4" fill="#94A3B8"/>

    <!-- Ear Cushions Base -->
    <ellipse cx="105" cy="270" rx="48" ry="72" fill="#0F172A"/>
    <ellipse cx="295" cy="270" rx="48" ry="72" fill="#0F172A"/>

    <!-- Model Earcup Outer Shell -->
    {$earcupDetail}
  </g>
SVG;
    }

    private function renderMonitorSvg(string $slug, string $name, string $brand, bool $isOverview): string
    {
        $isGaming = str_contains($slug, 'ultragear') || str_contains($slug, 'rog') || str_contains($slug, 'g7') || str_contains($slug, 'gaming');
        $isErgo = str_contains($slug, 'benq') || str_contains($slug, 'pd2706');
        $standColor = $isGaming ? '#1E293B' : '#CBD5E1';

        if ($isOverview) {
            // REAR HARDWARE & PORTS
            return <<<SVG
  <g transform="translate(140, 70)" filter="url(#pw-shadow)">
    <!-- Rear Casing -->
    <rect x="0" y="0" width="520" height="310" rx="14" fill="#1E293B" stroke="#475569" stroke-width="2"/>
    <rect x="200" y="90" width="120" height="120" rx="8" fill="#0F172A"/>
    <!-- VESA Screws -->
    <circle cx="220" cy="110" r="4" fill="#94A3B8"/>
    <circle cx="300" cy="110" r="4" fill="#94A3B8"/>
    <circle cx="220" cy="190" r="4" fill="#94A3B8"/>
    <circle cx="300" cy="190" r="4" fill="#94A3B8"/>
    <!-- Rear Port Strip -->
    <rect x="215" y="225" width="90" height="14" rx="3" fill="#020617"/>
    <rect x="225" y="228" width="10" height="8" fill="#F59E0B"/>
    <rect x="242" y="228" width="12" height="8" fill="#38BDF8"/>
    <rect x="260" y="228" width="12" height="8" fill="#38BDF8"/>
    <rect x="280" y="228" width="8" height="8" fill="#E2E8F0"/>
    <!-- Stand Neck -->
    <rect x="240" y="150" width="40" height="230" fill="{$standColor}"/>
    <rect x="170" y="380" width="180" height="16" rx="8" fill="{$standColor}"/>
  </g>
SVG;
        }

        // FRONT WORKSPACE SCREEN VIEW
        $standBase = match (true) {
            $isGaming => '<path d="M160 410 L260 375 L360 410 L340 416 L260 388 L180 416 Z" fill="#0F172A" stroke="#EF4444" stroke-width="1.5"/>',
            default => '<rect x="170" y="380" width="180" height="18" rx="6" fill="#94A3B8" stroke="#64748B" stroke-width="1.5"/>',
        };

        $screenArt = $isGaming ? '#030712' : '#0F172A';

        return <<<SVG
  <g transform="translate(140, 65)" filter="url(#pw-shadow)">
    <!-- Stand Column Behind Screen -->
    <rect x="242" y="180" width="36" height="205" fill="{$standColor}"/>
    {$standBase}

    <!-- Monitor Panel Border & Bezel -->
    <rect x="0" y="0" width="520" height="315" rx="8" fill="#0F172A" stroke="#334155" stroke-width="2"/>
    <!-- Active Display Matrix -->
    <rect x="8" y="8" width="504" height="294" rx="4" fill="{$screenArt}"/>
    <!-- Vivid Workspace Wallpaper Waves -->
    <path d="M8 220 C140 140 320 280 512 180 L512 302 L8 302 Z" fill="#2563EB" opacity="0.4"/>
    <path d="M8 260 C180 200 360 300 512 240 L512 302 L8 302 Z" fill="#38BDF8" opacity="0.3"/>

    <!-- Bottom Chin Manufacturer Badge -->
    <rect x="235" y="304" width="50" height="6" rx="3" fill="#64748B"/>
  </g>
SVG;
    }

    private function renderKeyboardSvg(string $slug, string $name, string $brand, bool $isOverview): string
    {
        $isNuphy = str_contains($slug, 'nuphy');
        $isKeychron = str_contains($slug, 'keychron');
        $isApple = str_contains($slug, 'apple');
        $isMxKeys = str_contains($slug, 'mx-keys');

        $chassisColor = match (true) {
            $isApple => '#E2E8F0', // Pure Aluminum
            $isNuphy => '#F1F5F9', // Retro Cream
            $isMxKeys => '#334155', // Space Graphite
            default => '#1E293B', // CNC Anodized Black
        };

        $escEnterColor = match (true) {
            $isNuphy => '#F97316', // Nuphy Orange
            $isKeychron => '#DC2626', // Keychron Red
            default => '#3B82F6',
        };

        $spacebarColor = match (true) {
            $isNuphy => '#EAB308', // Nuphy Yellow
            default => '#475569',
        };

        if ($isOverview) {
            // ERGONOMIC PROFILE & SIDE SWITCH ANGLE
            return <<<SVG
  <g transform="translate(130, 160)" filter="url(#pw-shadow)">
    <!-- Tilted Incline Wedge -->
    <path d="M40 180 L500 180 L480 60 L60 60 Z" fill="{$chassisColor}" stroke="#334155" stroke-width="2"/>
    <rect x="80" y="80" width="380" height="80" rx="8" fill="#0F172A"/>
    <!-- Switch Stems Visible Under Floating Keycaps -->
    <circle cx="120" cy="110" r="10" fill="#EF4444"/>
    <circle cx="160" cy="110" r="10" fill="#EF4444"/>
    <circle cx="200" cy="110" r="10" fill="#EF4444"/>
    <circle cx="240" cy="110" r="10" fill="#EF4444"/>
    <circle cx="280" cy="110" r="10" fill="#EF4444"/>
    <circle cx="320" cy="110" r="10" fill="#EF4444"/>
    <circle cx="360" cy="110" r="10" fill="#EF4444"/>
    <!-- Rear USB-C Port -->
    <rect x="250" y="55" width="40" height="10" rx="3" fill="#020617"/>
  </g>
SVG;
        }

        // FULL TOP-DOWN KEYBOARD VIEW
        return <<<SVG
  <g transform="translate(120, 130)" filter="url(#pw-shadow)">
    <!-- Keyboard Body -->
    <rect x="0" y="0" width="560" height="230" rx="16" fill="{$chassisColor}" stroke="#334155" stroke-width="2"/>
    <rect x="12" y="12" width="536" height="206" rx="10" fill="#0F172A"/>

    <!-- Keycaps Matrix -->
    <g fill="#334155" stroke="#1E293B" stroke-width="1.5">
      <!-- Row 1: Esc + Function Keys -->
      <rect x="20" y="20" width="30" height="28" rx="4" fill="{$escEnterColor}"/>
      <rect x="58" y="20" width="28" height="28" rx="4"/>
      <rect x="92" y="20" width="28" height="28" rx="4"/>
      <rect x="126" y="20" width="28" height="28" rx="4"/>
      <rect x="160" y="20" width="28" height="28" rx="4"/>
      <rect x="194" y="20" width="28" height="28" rx="4"/>
      <rect x="228" y="20" width="28" height="28" rx="4"/>
      <rect x="262" y="20" width="28" height="28" rx="4"/>
      <rect x="296" y="20" width="28" height="28" rx="4"/>
      <rect x="330" y="20" width="28" height="28" rx="4"/>
      <rect x="364" y="20" width="28" height="28" rx="4"/>
      <rect x="398" y="20" width="28" height="28" rx="4"/>
      <rect x="432" y="20" width="28" height="28" rx="4"/>
      <rect x="466" y="20" width="34" height="28" rx="4"/>
      <!-- Rotary Knob Top Right -->
      <circle cx="522" cy="34" r="14" fill="#94A3B8" stroke="#475569" stroke-width="2"/>
      <circle cx="522" cy="34" r="6" fill="#1E293B"/>

      <!-- Row 2: Numbers -->
      <rect x="20" y="56" width="30" height="28" rx="4"/>
      <rect x="56" y="56" width="30" height="28" rx="4"/>
      <rect x="92" y="56" width="30" height="28" rx="4"/>
      <rect x="128" y="56" width="30" height="28" rx="4"/>
      <rect x="164" y="56" width="30" height="28" rx="4"/>
      <rect x="200" y="56" width="30" height="28" rx="4"/>
      <rect x="236" y="56" width="30" height="28" rx="4"/>
      <rect x="272" y="56" width="30" height="28" rx="4"/>
      <rect x="308" y="56" width="30" height="28" rx="4"/>
      <rect x="344" y="56" width="30" height="28" rx="4"/>
      <rect x="380" y="56" width="30" height="28" rx="4"/>
      <rect x="416" y="56" width="30" height="28" rx="4"/>
      <rect x="452" y="56" width="56" height="28" rx="4"/>
      <rect x="514" y="56" width="26" height="28" rx="4"/>

      <!-- Row 3: Tab & QWERTY -->
      <rect x="20" y="92" width="44" height="28" rx="4"/>
      <rect x="70" y="92" width="30" height="28" rx="4"/>
      <rect x="106" y="92" width="30" height="28" rx="4"/>
      <rect x="142" y="92" width="30" height="28" rx="4"/>
      <rect x="178" y="92" width="30" height="28" rx="4"/>
      <rect x="214" y="92" width="30" height="28" rx="4"/>
      <rect x="250" y="92" width="30" height="28" rx="4"/>
      <rect x="286" y="92" width="30" height="28" rx="4"/>
      <rect x="322" y="92" width="30" height="28" rx="4"/>
      <rect x="358" y="92" width="30" height="28" rx="4"/>
      <rect x="394" y="92" width="30" height="28" rx="4"/>
      <rect x="430" y="92" width="42" height="28" rx="4"/>
      <rect x="478" y="92" width="30" height="28" rx="4"/>
      <rect x="514" y="92" width="26" height="28" rx="4"/>

      <!-- Row 4: Caps & Home Row -->
      <rect x="20" y="128" width="54" height="28" rx="4"/>
      <rect x="80" y="128" width="30" height="28" rx="4"/>
      <rect x="116" y="128" width="30" height="28" rx="4"/>
      <rect x="152" y="128" width="30" height="28" rx="4"/>
      <rect x="188" y="128" width="30" height="28" rx="4"/>
      <rect x="224" y="128" width="30" height="28" rx="4"/>
      <rect x="260" y="128" width="30" height="28" rx="4"/>
      <rect x="296" y="128" width="30" height="28" rx="4"/>
      <rect x="332" y="128" width="30" height="28" rx="4"/>
      <rect x="368" y="128" width="30" height="28" rx="4"/>
      <rect x="404" y="128" width="30" height="28" rx="4"/>
      <rect x="440" y="128" width="68" height="28" rx="4" fill="{$escEnterColor}"/>
      <rect x="514" y="128" width="26" height="28" rx="4"/>

      <!-- Row 5: Spacebar & Modifiers -->
      <rect x="20" y="164" width="40" height="28" rx="4"/>
      <rect x="66" y="164" width="40" height="28" rx="4"/>
      <rect x="112" y="164" width="40" height="28" rx="4"/>
      <rect x="158" y="164" width="220" height="28" rx="4" fill="{$spacebarColor}"/>
      <rect x="384" y="164" width="36" height="28" rx="4"/>
      <rect x="426" y="164" width="36" height="28" rx="4"/>
      <!-- Arrow Keys -->
      <rect x="472" y="164" width="26" height="28" rx="4"/>
      <rect x="504" y="164" width="26" height="28" rx="4"/>
    </g>
  </g>
SVG;
    }

    private function renderSmartwatchSvg(string $slug, string $name, string $brand, bool $isOverview): string
    {
        $isAppleUltra = str_contains($slug, 'ultra');
        $isApple = str_contains($slug, 'apple') || str_contains($slug, 'series-10');
        $isGarmin = str_contains($slug, 'garmin');
        $isSamsung = str_contains($slug, 'samsung') || str_contains($slug, 'galaxy');
        $isRound = $isGarmin || $isSamsung || str_contains($slug, 'pixel') || str_contains($slug, 'cmf') || str_contains($slug, 'oneplus');

        $strapColor = match (true) {
            $isAppleUltra => '#EA580C', // Orange Ocean Band
            $isGarmin => '#0284C7', // Garmin Blue Sports Band
            default => '#1E293B', // Charcoal Silicone
        };

        $caseColor = match (true) {
            $isAppleUltra => '#94A3B8', // Titanium 49mm
            $isApple => '#0F172A', // Jet Black
            $isGarmin => '#334155', // Carbon Gray Bezel
            default => '#1E293B',
        };

        if ($isOverview) {
            // BIOMETRIC OPTICAL SENSOR UNDERSIDE
            return <<<SVG
  <g transform="translate(280, 80)" filter="url(#pw-shadow)">
    <!-- Straps Top & Bottom -->
    <rect x="65" y="0" width="110" height="80" rx="8" fill="{$strapColor}"/>
    <rect x="65" y="300" width="110" height="80" rx="8" fill="{$strapColor}"/>

    <!-- Watch Underside Case -->
    <rect x="30" y="60" width="180" height="260" rx="48" fill="{$caseColor}"/>
    <!-- Sapphire Bio-Sensor Center Puck -->
    <circle cx="120" cy="190" r="55" fill="#020617" stroke="#475569" stroke-width="2"/>
    <!-- Optical Green/Red LEDs -->
    <circle cx="100" cy="170" r="8" fill="#22C55E"/>
    <circle cx="140" cy="170" r="8" fill="#22C55E"/>
    <circle cx="100" cy="210" r="8" fill="#EF4444"/>
    <circle cx="140" cy="210" r="8" fill="#EF4444"/>
    <circle cx="120" cy="190" r="10" fill="#E2E8F0" opacity="0.8"/>
  </g>
SVG;
        }

        // FRONT WATCH FACE & STRAP
        if ($isRound) {
            // CIRCULAR SMARTWATCH (Galaxy Watch 7, Garmin Forerunner/Fenix, Pixel Watch, CMF)
            return <<<SVG
  <g transform="translate(280, 60)" filter="url(#pw-shadow)">
    <!-- Vented Sports Strap -->
    <rect x="70" y="0" width="100" height="90" rx="10" fill="{$strapColor}"/>
    <rect x="70" y="310" width="100" height="90" rx="10" fill="{$strapColor}"/>

    <!-- Circular Bezel & Frame -->
    <circle cx="120" cy="200" r="110" fill="{$caseColor}" stroke="#475569" stroke-width="3"/>
    <circle cx="120" cy="200" r="96" fill="#000000"/>

    <!-- Hardware Side Buttons -->
    <rect x="228" y="160" width="6" height="26" rx="3" fill="#64748B"/>
    <rect x="228" y="214" width="6" height="26" rx="3" fill="#64748B"/>

    <!-- Active Watch Face Complications -->
    <circle cx="120" cy="200" r="84" fill="#0F172A"/>
    <!-- Fitness Progress Ring -->
    <circle cx="120" cy="200" r="68" fill="none" stroke="#22C55E" stroke-width="8" stroke-dasharray="280 120"/>
    <circle cx="120" cy="200" r="54" fill="none" stroke="#38BDF8" stroke-width="8" stroke-dasharray="210 140"/>

    <text x="120" y="195" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">10:08</text>
    <text x="120" y="222" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#FACC15">7,842 STEPS</text>
  </g>
SVG;
        }

        // RECTANGULAR SMARTWATCH (Apple Watch Series 10 / Apple Watch Ultra 2)
        $actionBtn = $isAppleUltra ? '<rect x="24" y="160" width="6" height="42" rx="3" fill="#EA580C"/>' : '';

        return <<<SVG
  <g transform="translate(280, 55)" filter="url(#pw-shadow)">
    <!-- Straps Top & Bottom -->
    <rect x="65" y="0" width="110" height="90" rx="12" fill="{$strapColor}"/>
    <rect x="65" y="320" width="110" height="90" rx="12" fill="{$strapColor}"/>

    <!-- Digital Crown & Side Button on Right -->
    <rect x="206" y="130" width="8" height="44" rx="4" fill="#CBD5E1"/>
    <circle cx="210" cy="152" r="6" fill="#EF4444"/>
    <rect x="206" y="195" width="6" height="36" rx="3" fill="#64748B"/>
    {$actionBtn}

    <!-- Curved Watch Case -->
    <rect x="30" y="65" width="180" height="260" rx="48" fill="{$caseColor}" stroke="#475569" stroke-width="2.5"/>
    <!-- Display Glass -->
    <rect x="38" y="73" width="164" height="244" rx="40" fill="#000000"/>
    <!-- WatchOS Activity Modular Display -->
    <rect x="42" y="77" width="156" height="236" rx="36" fill="#0B0F19"/>

    <text x="120" y="140" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="#FFFFFF">9:41</text>

    <!-- Activity Rings -->
    <circle cx="85" cy="205" r="26" fill="none" stroke="#EF4444" stroke-width="6" stroke-dasharray="120 40"/>
    <circle cx="85" cy="205" r="18" fill="none" stroke="#22C55E" stroke-width="6" stroke-dasharray="80 30"/>
    <circle cx="85" cy="205" r="10" fill="none" stroke="#38BDF8" stroke-width="6" stroke-dasharray="45 20"/>

    <!-- Right Widget Metrics -->
    <rect x="125" y="180" width="55" height="18" rx="4" fill="#1E293B"/>
    <text x="152" y="193" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#22C55E">68 BPM</text>

    <rect x="125" y="206" width="55" height="18" rx="4" fill="#1E293B"/>
    <text x="152" y="219" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#38BDF8">72° SUN</text>
  </g>
SVG;
    }

    private function renderFallbackSvg(string $categorySlug, string $name, string $brand, bool $isOverview): string
    {
        $motif = $this->categorySilhouette($categorySlug, 280, 120, '#0F5E5A', '#F2B134');

        return <<<SVG
  <g transform="translate(260, 100)" filter="url(#pw-shadow)">
    <rect width="280" height="280" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    {$motif}
  </g>
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
