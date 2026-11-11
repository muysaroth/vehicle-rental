<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The core of the Vehicle Sales & Rental system.
 *
 *   customers ─┬─< bookings >── vehicles ──< expenses
 *              └─< sales    >──┘
 *   bookings / sales ──< payments
 *   users (staff) record every booking, sale, payment and expense.
 *
 * See docs/02-system-design.md for the ERD and data dictionary.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->string('id_card_no', 40)->nullable();
            $table->string('license_no', 40)->nullable();
            $table->string('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('phone');
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('plate_no', 30)->unique();
            $table->string('brand', 60);
            $table->string('model', 60);
            $table->unsignedSmallInteger('year');
            // car | suv | van | pickup | motorbike
            $table->string('type', 20);
            $table->string('color', 30)->nullable();
            $table->unsignedTinyInteger('seats')->default(4);
            // rent | sale | both
            $table->string('purpose', 10)->default('rent');
            // available | reserved | rented | maintenance | sold
            $table->string('status', 15)->default('available');
            $table->decimal('daily_rate', 10, 2)->default(0);
            $table->decimal('sale_price', 12, 2)->default(0);
            // What the company paid for it -- the investment the reports weigh.
            $table->decimal('purchase_cost', 12, 2)->default(0);
            $table->date('purchased_on')->nullable();
            $table->unsignedInteger('mileage')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_no', 20)->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('vehicle_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedInteger('days');
            $table->decimal('daily_rate', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('late_fee', 10, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->decimal('deposit', 10, 2)->default(0);
            // reserved | active | returned | cancelled
            $table->string('status', 12)->default('reserved');
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->unsignedInteger('pickup_mileage')->nullable();
            $table->unsignedInteger('return_mileage')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['vehicle_id', 'status', 'start_date', 'end_date']);
            $table->index(['status', 'start_date']);
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('sale_no', 20)->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('vehicle_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->date('sale_date');
            $table->decimal('price', 12, 2);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            // The vehicle's purchase cost at the moment of sale, so profit
            // stays correct even if the vehicle record is edited later.
            $table->decimal('cost', 12, 2)->default(0);
            // cash | bank | installment
            $table->string('payment_method', 15)->default('cash');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('sale_date');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            // cash | bank | card
            $table->string('method', 10)->default('cash');
            $table->timestamp('paid_at');
            $table->string('reference', 60)->nullable();
            $table->timestamps();

            $table->index('paid_at');
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->date('spent_on');
            // maintenance | insurance | fuel | cleaning | other
            $table->string('category', 15);
            $table->decimal('amount', 10, 2);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index('spent_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('customers');
    }
};
