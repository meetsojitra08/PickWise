<?php

declare(strict_types=1);

use App\Queries\Catalog\PostgresProductSearch;

test('postgres search term preparation separates wildcard, fts, and trigram tokens cleanly', function (): void {
    $search = new PostgresProductSearch;

    $normal = $search->prepareTerms(['gaming', 'mouse', 'usb-c', 'x1']);
    expect($normal['wildcard_tokens'])->toBe([])
        ->and($normal['fts_words'])->toBe(['gaming', 'mouse', 'usb', 'c', 'x1'])
        ->and($normal['trigram_words'])->toBe(['gaming', 'mouse', 'usb'])
        ->and($normal['has_fallback_candidates'])->toBeTrue();

    $withWildcards = $search->prepareTerms(['100%', '50_off', 'mechanical']);
    expect($withWildcards['wildcard_tokens'])->toBe(['100%', '50_off'])
        ->and($withWildcards['fts_words'])->toBe(['mechanical'])
        ->and($withWildcards['trigram_words'])->toBe(['mechanical'])
        ->and($withWildcards['has_fallback_candidates'])->toBeTrue();

    $onlyWildcardAndPunctuation = $search->prepareTerms(['100%', '???', 'ab']);
    expect($onlyWildcardAndPunctuation['wildcard_tokens'])->toBe(['100%'])
        ->and($onlyWildcardAndPunctuation['fts_words'])->toBe(['ab'])
        ->and($onlyWildcardAndPunctuation['trigram_words'])->toBe([])
        ->and($onlyWildcardAndPunctuation['has_fallback_candidates'])->toBeTrue();

    $mixedOperators = $search->prepareTerms(['macbook', '&', '|', '!', ':', '(', ')', '*']);
    expect($mixedOperators['wildcard_tokens'])->toBe([])
        ->and($mixedOperators['fts_words'])->toBe(['macbook'])
        ->and($mixedOperators['trigram_words'])->toBe(['macbook'])
        ->and($mixedOperators['has_fallback_candidates'])->toBeTrue();

    $onlySymbols = $search->prepareTerms(['???', '!!!']);
    expect($onlySymbols['wildcard_tokens'])->toBe(['???', '!!!'])
        ->and($onlySymbols['fts_words'])->toBe([])
        ->and($onlySymbols['trigram_words'])->toBe([])
        ->and($onlySymbols['has_fallback_candidates'])->toBeFalse();
});
