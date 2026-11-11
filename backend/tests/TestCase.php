<?php

namespace Tests;

use App\Models\Branch;
use App\Models\Shift;
use App\Models\User;
use App\Services\CurrentBranch;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * The branch a test works in when it does not care which.
     *
     * The first the shop opened. It is where the migrations file everything
     * that was on the books before branches existed, where a row written with
     * no branch named lands, and what a request authenticated without a token
     * falls back to -- so a test that never mentions a branch is consistently
     * in this one, at every layer.
     */
    protected function branch(): Branch
    {
        return $this->branchAt(0);
    }

    /**
     * The room next door. Every test about branches needs one: the interesting
     * assertion is never that a branch can see its own takings, it is that it
     * cannot see the other's.
     */
    protected function otherBranch(): Branch
    {
        return $this->branchAt(1);
    }

    /**
     * Write rows as though signed in at $branch, the way the seeder does and
     * the way ResolveBranch does for a request.
     *
     * @template T
     *
     * @param  callable(): T  $work
     * @return T
     */
    protected function atBranch(Branch $branch, callable $work): mixed
    {
        return app(CurrentBranch::class)->on($branch, $work);
    }

    /**
     * Open the drawer at $branch, which a till has to do before it takes money.
     *
     * Written straight to the table rather than through the endpoint: a test
     * about pricing or stock should not also be a test of opening a shift. The
     * shift endpoint has tests of its own.
     */
    protected function openShift(User $by, ?Branch $branch = null): Shift
    {
        return $this->atBranch($branch ?? $this->branch(), fn () => Shift::create([
            'user_id' => $by->id,
            'opened_at' => now(),
            'status' => Shift::STATUS_OPEN,
        ]));
    }

    /**
     * A terminal signed in at $branch, the way the sign-in screen mints one.
     *
     * `actingAs` cannot say this: it authenticates without a token, so the
     * branch falls back to the account's own. Anything asserting that one
     * branch cannot see the other has to sign in the way a register does.
     */
    protected function signedInAt(User $user, Branch $branch): static
    {
        $issued = $user->createToken('test-terminal');
        $issued->accessToken->forceFill(['branch_id' => $branch->id])->save();

        /*
         * The guard resolves a user once and then holds it, and a test does not
         * get a fresh application between requests -- so without this the second
         * sign-in in a test is served the first one's token, and every assertion
         * about the other branch quietly runs against the first.
         */
        $this->app['auth']->forgetGuards();

        return $this->withToken($issued->plainTextToken);
    }

    private function branchAt(int $position): Branch
    {
        return Branch::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->skip($position)
            ->limit(1)
            ->firstOrFail();
    }
}
