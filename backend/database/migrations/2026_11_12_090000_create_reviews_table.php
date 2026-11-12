<?php

declare(strict_types=1);

use App\Enums\ReviewStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $connection = DB::connection($this->getConnection());
        $driver = $connection->getDriverName();

        Schema::connection($this->getConnection())->create('reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_name', 120)->nullable();
            $table->unsignedTinyInteger('rating');
            $table->string('title', 150);
            $table->text('body');
            $table->string('status', 20)->default(ReviewStatus::Pending->value);
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->index('product_id');
            $table->index('status');
        });

        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            $connection->statement('CREATE UNIQUE INDEX reviews_product_user_unique ON reviews (product_id, user_id) WHERE user_id IS NOT NULL');
        }

        if ($driver === 'pgsql') {
            $connection->statement('ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range_check CHECK (rating BETWEEN 1 AND 5)');
        }
    }

    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('reviews');
    }
};
