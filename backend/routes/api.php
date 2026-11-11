<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/password', [AuthController::class, 'password'])->middleware('throttle:6,1');
    Route::get('/company', [AuthController::class, 'company']);

    // ---- Front desk (every staff member) ---------------------------------
    Route::get('/dashboard', [ReportController::class, 'dashboard']);

    Route::get('/vehicles', [VehicleController::class, 'index']);
    Route::get('/vehicles/available', [VehicleController::class, 'available']);
    Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show']);

    Route::apiResource('customers', CustomerController::class)->except('destroy');

    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::put('/bookings/{booking}', [BookingController::class, 'update']);
    Route::post('/bookings/{booking}/pickup', [BookingController::class, 'pickup']);
    Route::post('/bookings/{booking}/return', [BookingController::class, 'return']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::post('/bookings/{booking}/pay', [BookingController::class, 'pay']);

    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
    Route::post('/sales/{sale}/pay', [SaleController::class, 'pay']);

    // ---- Management ------------------------------------------------------
    Route::middleware('manages')->group(function () {
        Route::post('/vehicles', [VehicleController::class, 'store']);
        Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update']);
        Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy']);

        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::delete('/sales/{sale}', [SaleController::class, 'destroy']);

        Route::apiResource('expenses', ExpenseController::class)->except('show');

        Route::get('/reports/performance', [ReportController::class, 'performance']);
    });

    Route::middleware('admin')->group(function () {
        Route::apiResource('users', UserController::class)->except('show');
        Route::get('/activity', [ActivityController::class, 'index']);
    });
});
