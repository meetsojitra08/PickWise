<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PostgresExtensionsMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrations_run_cleanly_and_enable_postgres_extensions_when_on_pgsql(): void
    {
        $this->assertTrue(Schema::hasTable('migrations'));
        $this->assertTrue(Schema::hasTable('users'));

        $migrationRecorded = DB::table('migrations')
            ->where('migration', 'like', '%_enable_pg_trgm_and_unaccent_extensions')
            ->exists();

        if (DB::getDriverName() === 'pgsql') {
            $this->assertTrue($migrationRecorded);

            /** @var list<string> $extensions */
            $extensions = DB::table('pg_extension')
                ->whereIn('extname', ['pg_trgm', 'unaccent'])
                ->pluck('extname')
                ->all();

            $this->assertEqualsCanonicalizing(['pg_trgm', 'unaccent'], $extensions);

            /** @var object{score: float|string}|null $similarity */
            $similarity = DB::selectOne("SELECT similarity('laptop', 'laptp') AS score");
            $this->assertNotNull($similarity);
            $this->assertGreaterThan(0.0, (float) $similarity->score);

            /** @var object{clean: string}|null $unaccented */
            $unaccented = DB::selectOne("SELECT unaccent('Café') AS clean");
            $this->assertNotNull($unaccented);
            $this->assertSame('Cafe', $unaccented->clean);

            return;
        }

        $this->assertFalse($migrationRecorded);
    }

    public function test_extension_migration_respects_database_driver(): void
    {
        $files = glob(database_path('migrations/*_enable_pg_trgm_and_unaccent_extensions.php'));
        $this->assertIsArray($files);
        $this->assertCount(1, $files);

        $migration = require $files[0];
        $this->assertInstanceOf(Migration::class, $migration);

        $isPostgres = DB::connection($migration->getConnection())->getDriverName() === 'pgsql';
        $this->assertSame($isPostgres, $migration->shouldRun());

        if (! $isPostgres) {
            // Direct invocation must also guard against non-PostgreSQL drivers (e.g. migrate --pretend).
            $migration->up();
            $migration->down();
        }
    }
}
