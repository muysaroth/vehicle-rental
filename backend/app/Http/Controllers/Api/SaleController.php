<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** The vehicle sales transaction processing system. */
class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $sales = Sale::query()
            ->with(['customer:id,name,phone', 'vehicle:id,plate_no,brand,model,type,year', 'user:id,name', 'payments'])
            ->when($request->query('from'), fn ($q, $from) => $q->whereDate('sale_date', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->whereDate('sale_date', '<=', $to))
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('sale_no', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                ->orWhereHas('vehicle', fn ($v) => $v->where('plate_no', 'like', "%{$search}%"))))
            ->orderByDesc('sale_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($sales);
    }

    public function show(Sale $sale): JsonResponse
    {
        return response()->json($sale->load(['customer', 'vehicle', 'user:id,name', 'payments.user:id,name']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'sale_date' => ['required', 'date'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', Rule::in(Sale::METHODS)],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $sale = DB::transaction(function () use ($data, $request) {
            $vehicle = Vehicle::lockForUpdate()->findOrFail($data['vehicle_id']);

            if (! $vehicle->canBeSold()) {
                throw ValidationException::withMessages(['vehicle_id' => 'This vehicle is not available for sale.']);
            }

            $price = (float) ($data['price'] ?? $vehicle->sale_price);
            $discount = (float) ($data['discount'] ?? 0);

            if ($discount > $price) {
                throw ValidationException::withMessages(['discount' => 'The discount cannot be more than the price.']);
            }

            $total = round($price - $discount, 2);
            $paid = (float) ($data['amount_paid'] ?? ($data['payment_method'] === 'installment' ? 0 : $total));

            if ($paid > $total) {
                throw ValidationException::withMessages(['amount_paid' => 'The amount paid is more than the total.']);
            }

            $sale = Sale::create([
                'sale_no' => Sale::nextNumber(),
                'customer_id' => $data['customer_id'],
                'vehicle_id' => $vehicle->id,
                'user_id' => $request->user()->id,
                'sale_date' => $data['sale_date'],
                'price' => $price,
                'discount' => $discount,
                'total' => $total,
                'cost' => $vehicle->purchase_cost,
                'payment_method' => $data['payment_method'],
                'notes' => $data['notes'] ?? null,
            ]);

            if ($paid > 0) {
                $sale->payments()->create([
                    'user_id' => $request->user()->id,
                    'amount' => $paid,
                    'method' => $data['payment_method'] === 'installment' ? 'cash' : $data['payment_method'],
                    'paid_at' => now(),
                    'reference' => $data['payment_method'] === 'installment' ? 'Down payment' : null,
                ]);
            }

            $vehicle->forceFill(['status' => 'sold'])->save();

            return $sale;
        });

        return response()->json($sale->load(['customer', 'vehicle', 'payments']), 201);
    }

    public function pay(Request $request, Sale $sale): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::in(Payment::METHODS)],
            'reference' => ['nullable', 'string', 'max:60'],
        ]);

        if ($data['amount'] > $sale->balance + 0.001) {
            throw ValidationException::withMessages(['amount' => 'The payment is more than the balance due.']);
        }

        $sale->payments()->create([
            'user_id' => $request->user()->id,
            'amount' => round((float) $data['amount'], 2),
            'method' => $data['method'],
            'paid_at' => now(),
            'reference' => $data['reference'] ?? null,
        ]);

        return response()->json($sale->fresh(['customer', 'vehicle', 'payments']));
    }

    /** Undo a sale entered by mistake: the vehicle goes back on the lot. */
    public function destroy(Sale $sale): JsonResponse
    {
        DB::transaction(function () use ($sale) {
            $vehicle = $sale->vehicle;
            $sale->delete();
            $vehicle->forceFill(['status' => 'available'])->save();
            $vehicle->refreshStatus();
        });

        return response()->json(['ok' => true]);
    }
}
