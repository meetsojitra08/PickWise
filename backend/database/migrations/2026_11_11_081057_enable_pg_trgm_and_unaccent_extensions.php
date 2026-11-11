<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Skip on non-PostgreSQL drivers (e.g. SQLite test databases).
     */
    public function shouldRun(): bool
    {
        return $this->isPostgres();
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! $this->isPostgres()) {
            return;
        }

        $schema = Schema::connection($this->getConnection());
        $schema->ensureExtensionExists('pg_trgm');
        $schema->ensureExtensionExists('unaccent');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->isPostgres()) {
            return;
        }

        $connection = DB::connection($this->getConnection());
        $connection->statement('DROP EXTENSION IF EXISTS unaccent');
        $connection->statement('DROP EXTENSION IF EXISTS pg_trgm');
    }

    private function isPostgres(): bool
    {
        return DB::connection($this->getConnection())->getDriverName() === 'pgsql';
    }
};
