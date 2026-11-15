<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Groq API
    |--------------------------------------------------------------------------
    |
    | The model id is intentionally not defaulted here: Groq retires models, so
    | the current id belongs in the environment instead of version control.
    |
    */

    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'base_url' => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
        'model' => env('GROQ_MODEL'),
        'timeout_seconds' => (int) env('GROQ_TIMEOUT_SECONDS', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Daily quota
    |--------------------------------------------------------------------------
    |
    | Successful AI calls allowed per user (or guest session) each day.
    |
    */

    'daily_quota' => [
        'user' => (int) env('AI_DAILY_QUOTA_USER', 30),
        'guest' => (int) env('AI_DAILY_QUOTA_GUEST', 5),
    ],

    /*
    |--------------------------------------------------------------------------
    | Assistant throttle rate limit
    |--------------------------------------------------------------------------
    |
    | Maximum messages allowed per minute before throttling kicks in.
    |
    */

    'rate_limit_per_minute' => (int) env('AI_RATE_LIMIT_PER_MINUTE', 60),

];
