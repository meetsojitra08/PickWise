<?php

declare(strict_types=1);

use App\Enums\SpecDataType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->getConnection())->create('spec_definitions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('key');
            $table->string('label');
            $table->string('unit')->nullable();
            $table->string('data_type', 20)->default(SpecDataType::Text->value);
            $table->boolean('is_filterable')->default(false);
            $table->boolean('is_comparable')->default(false);
            $table->boolean('higher_is_better')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['category_id', 'key']);
            $table->index(['category_id', 'sort_order']);
            $table->index(['category_id', 'is_filterable', 'sort_order']);
            $table->index(['category_id', 'is_comparable', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('spec_definitions');
    }
};
