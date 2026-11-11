<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit trail: who created, changed or deleted what, and when. Written by the
 * App\Models\Concerns\Auditable trait and by the login/logout/password actions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            // Kept even if the user is deleted later, together with their name.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name', 100)->nullable();
            // created | updated | deleted | login | logout | password
            $table->string('action', 20);
            // Short model name, e.g. Booking, Vehicle. Null for login/logout.
            $table->string('subject_type', 40)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            // Human label of the record at the time, e.g. "BK000123" or "Toyota Camry · PP 2A-1099".
            $table->string('subject_label', 150)->nullable();
            // {"field": [old, new], ...} for updates; the attributes for create/delete.
            $table->json('changes')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['subject_type', 'subject_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
