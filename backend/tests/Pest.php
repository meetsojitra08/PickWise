<?php

declare(strict_types=1);

use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Bind Laravel's base TestCase to all Feature tests so HTTP helpers,
| container bindings, and configuration are available by default.
|
*/

uses(TestCase::class)->in('Feature');
