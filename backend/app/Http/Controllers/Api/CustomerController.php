<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $customers = Customer::query()
            ->withCount(['bookings', 'sales'])
            ->withSum(['bookings as rental_spend' => fn ($q) => $q->where('status', '!=', 'cancelled')], 'total')
            ->withSum('sales as purchase_spend', 'total')
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('id_card_no', 'like', "%{$search}%")))
            ->orderBy('name')
            ->get();

        return response()->json($customers);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->load([
            'bookings' => fn ($q) => $q->with(['vehicle:id,plate_no,brand,model,type', 'payments'])->latest('start_date'),
            'sales' => fn ($q) => $q->with(['vehicle:id,plate_no,brand,model,type', 'payments'])->latest('sale_date'),
        ]);

        return response()->json($customer);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Customer::create($this->validated($request)), 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $customer->update($this->validated($request));

        return response()->json($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        abort_if(
            $customer->bookings()->exists() || $customer->sales()->exists(),
            422,
            'This customer has bookings or purchases and cannot be deleted.'
        );

        $customer->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'id_card_no' => ['nullable', 'string', 'max:40'],
            'license_no' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
