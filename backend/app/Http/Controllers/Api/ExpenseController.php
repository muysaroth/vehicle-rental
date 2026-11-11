<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Running costs: maintenance, insurance, fuel -- the "costs" side of the books. */
class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $expenses = Expense::query()
            ->with(['vehicle:id,plate_no,brand,model,type', 'user:id,name'])
            ->when($request->query('from'), fn ($q, $from) => $q->whereDate('spent_on', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->whereDate('spent_on', '<=', $to))
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->when($request->query('vehicle_id'), fn ($q, $v) => $q->where('vehicle_id', $v))
            ->orderByDesc('spent_on')
            ->orderByDesc('id')
            ->get();

        return response()->json($expenses);
    }

    public function store(Request $request): JsonResponse
    {
        $expense = Expense::create($this->validated($request) + ['user_id' => $request->user()->id]);

        return response()->json($expense->load('vehicle:id,plate_no,brand,model,type'), 201);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $expense->update($this->validated($request));

        return response()->json($expense->load('vehicle:id,plate_no,brand,model,type'));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'spent_on' => ['required', 'date'],
            'category' => ['required', Rule::in(Expense::CATEGORIES)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
