<?php

declare(strict_types=1);

use App\AI\GroqClientContract;
use Tests\AI\FakeGroqClient;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Bind Laravel's base TestCase to Feature and AI tests so HTTP helpers,
| container bindings, and configuration are available by default.
|
*/

uses(TestCase::class)->in('Feature', 'AI');

/**
 * Replace the real Groq client with a prepared fake for the current test.
 */
function fakeGroqClient(): FakeGroqClient
{
    $fake = new FakeGroqClient;

    app()->instance(GroqClientContract::class, $fake);

    return $fake;
}
