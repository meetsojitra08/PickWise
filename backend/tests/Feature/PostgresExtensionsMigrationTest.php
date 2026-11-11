<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('migrations run cleanly and enable postgres extensions when on pgsql', function (): void {
    expect(Schema::hasTable('migrations'))->toBeTrue()
        ->and(Schema::hasTable('users'))->toBeTrue();

    $migrationRecorded = DB::table('migrations')
        ->where('migration', 'like', '%_enable_pg_trgm_and_unaccent_extensions')
        ->exists();

    if (DB::getDriverName() === 'pgsql') {
        expect($migrationRecorded)->toBeTrue();

        /** @var list<string> $extensions */
        $extensions = DB::table('pg_extension')
            ->whereIn('extname', ['pg_trgm', 'unaccent'])
            ->pluck('extname')
            ->all();

        expect($extensions)->toEqualCanonicalizing(['pg_trgm', 'unaccent']);

        /** @var object{score: float|string}|null $similarity */
        $similarity = DB::selectOne("SELECT similarity('laptop', 'laptp') AS score");
        expect($similarity)->not->toBeNull();
        expect((float) $similarity->score)->toBeGreaterThan(0.0);

        /** @var object{clean: string}|null $unaccented */
        $unaccented = DB::selectOne("SELECT unaccent('Café') AS clean");
        expect($unaccented)->not->toBeNull();
        expect($unaccented->clean)->toBe('Cafe');

        return;
    }

    expect($migrationRecorded)->toBeFalse();
});

test('extension migration respects database driver', function (): void {
    $files = glob(database_path('migrations/*_enable_pg_trgm_and_unaccent_extensions.php'));
    expect($files)->toBeArray()->toHaveCount(1);

    $migration = require $files[0];
    expect($migration)->toBeInstanceOf(Migration::class);

    $isPostgres = DB::connection($migration->getConnection())->getDriverName() === 'pgsql';
    expect($migration->shouldRun())->toBe($isPostgres);

    if (! $isPostgres) {
        // Direct invocation must also guard against non-PostgreSQL drivers (e.g. migrate --pretend).
        $migration->up();
        $migration->down();
    }
});
