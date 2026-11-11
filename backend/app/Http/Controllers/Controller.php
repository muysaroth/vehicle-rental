<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * How many rows one page of a listing may be.
     *
     * Every paginated screen took `per_page` from the query string and handed
     * it straight to `paginate()`, with a sensible default and no ceiling --
     * so `?per_page=100000` was a supported request. That is not a page, it is
     * the whole table serialised into one JSON body -- and `artisan serve`
     * answers one request at a time, so it is every other till in the shop
     * waiting behind it. It does not take malice: a script written against
     * this API with a big number in it, or a manager who edits the address
     * bar, does it by accident.
     *
     * The cap is well above any screen's own default, so nothing legitimate
     * meets it, and a request over the line is quietly served the largest page
     * there is rather than refused -- the caller wanted as much as it could
     * get, and it gets it.
     */
    private const MAX_PER_PAGE = 200;

    protected function perPage(Request $request, int $default): int
    {
        $asked = $request->integer('per_page', $default);

        // A zero or a negative would have Laravel serve every row at once,
        // which is the thing this exists to stop.
        return max(1, min($asked, self::MAX_PER_PAGE));
    }
}
