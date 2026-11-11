<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VehicleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $vehicles = Vehicle::query()
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('purpose'), fn ($q, $purpose) => $q->whereIn('purpose', [$purpose, 'both']))
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('plate_no', 'like', "%{$search}%")
                ->orWhere('brand', 'like', "%{$search}%")
                ->orWhere('model', 'like', "%{$search}%")))
            ->withCount(['bookings as rentals_count' => fn ($q) => $q->whereIn('status', ['active', 'returned'])])
            ->orderBy('type')->orderBy('brand')->orderBy('model')
            ->get();

        return response()->json($vehicles);
    }

    /**
     * Vehicles that can be rented for the whole of $start..$end -- what the
     * booking screen offers, so staff never pick a car that is already out.
     */
    public function available(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'type' => ['nullable', Rule::in(Vehicle::TYPES)],
        ]);

        $vehicles = Vehicle::query()
            ->whereIn('purpose', ['rent', 'both'])
            ->whereNotIn('status', ['sold', 'maintenance'])
            ->when($data['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->whereDoesntHave('bookings', fn ($q) => $q->overlapping($data['start_date'], $data['end_date']))
            ->orderBy('type')->orderBy('daily_rate')
            ->get();

        return response()->json($vehicles);
    }

    public function show(Vehicle $vehicle): JsonResponse
    {
        $vehicle->load([
            'bookings' => fn ($q) => $q->with('customer:id,name,phone')->latest('start_date')->limit(50),
            'sale.customer:id,name,phone',
            'expenses' => fn ($q) => $q->latest('spent_on')->limit(50),
        ]);

        return response()->json($vehicle);
    }

    public function store(Request $request): JsonResponse
    {
        $vehicle = Vehicle::create($this->validated($request) + ['status' => 'available']);

        return response()->json($vehicle, 201);
    }

    public function update(Request $request, Vehicle $vehicle): JsonResponse
    {
        abort_if($vehicle->status === 'sold', 422, 'A sold vehicle cannot be edited.');

        $data = $this->validated($request, $vehicle);

        // Staff only ever toggle maintenance by hand; rented/reserved/sold are
        // set by the bookings and sales themselves.
        $status = $request->validate(['status' => ['nullable', Rule::in(['available', 'maintenance'])]])['status'] ?? null;

        if ($status === 'maintenance') {
            abort_if($vehicle->status === 'rented', 422, 'The vehicle is out on rent. Return it first.');
        }

        $vehicle->update($data + ($status ? ['status' => $status] : []));

        if ($status === 'available') {
            $vehicle->refreshStatus();
        }

        return response()->json($vehicle->fresh());
    }

    public function destroy(Vehicle $vehicle): JsonResponse
    {
        abort_if(
            $vehicle->bookings()->exists() || $vehicle->sale()->exists(),
            422,
            'This vehicle has bookings or a sale on record and cannot be deleted.'
        );

        $vehicle->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?Vehicle $vehicle = null): array
    {
        return $request->validate([
            'plate_no' => ['required', 'string', 'max:30', Rule::unique('vehicles', 'plate_no')->ignore($vehicle?->id)],
            'brand' => ['required', 'string', 'max:60'],
            'model' => ['required', 'string', 'max:60'],
            'year' => ['required', 'integer', 'min:1980', 'max:'.((int) date('Y') + 1)],
            'type' => ['required', Rule::in(Vehicle::TYPES)],
            'color' => ['nullable', 'string', 'max:30'],
            'seats' => ['required', 'integer', 'min:1', 'max:60'],
            'purpose' => ['required', Rule::in(Vehicle::PURPOSES)],
            'daily_rate' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'purchased_on' => ['nullable', 'date'],
            'mileage' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
