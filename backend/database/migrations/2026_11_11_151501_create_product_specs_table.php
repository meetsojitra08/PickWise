<?php

declare(strict_types=1);

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
        Schema::connection($this->getConnection())->create('product_specs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('spec_definition_id')->constrained('spec_definitions')->cascadeOnDelete();
            $table->string('value_text', 500)->nullable();
            $table->decimal('value_number', 14, 4)->nullable();
            $table->boolean('value_bool')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'spec_definition_id']);
            $table->index(['spec_definition_id', 'value_number']);
            $table->index(['spec_definition_id', 'value_bool']);
            $table->index(['spec_definition_id', 'value_text']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('product_specs');
    }
};
