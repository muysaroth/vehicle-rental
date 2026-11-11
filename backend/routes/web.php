<?php

use Illuminate\Support\Facades\Route;

Route::redirect('/', '/app');

// The React app, built by `npm run build` in frontend/ into public/build.
$spa = function () {
    $index = public_path('build/index.html');

    abort_unless(file_exists($index), 404, 'The front end has not been built yet. Run "npm run build" in frontend/.');

    return response()->file($index, ['Cache-Control' => 'no-cache']);
};

Route::get('/app', $spa);
Route::get('/app/{path}', $spa)->where('path', '.*');
