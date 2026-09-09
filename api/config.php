<?php
declare(strict_types=1);
// Секреты задаются окружением PHP/FPM или конфигурацией вне публичного каталога.
return [
    'origin' => rtrim(getenv('SITE_ORIGIN') ?: '', '/'),
    'host' => getenv('SMTP_HOST') ?: '',
    'port' => (int)(getenv('SMTP_PORT') ?: 587),
    'username' => getenv('SMTP_USERNAME') ?: '',
    'password' => getenv('SMTP_PASSWORD') ?: '',
    'from' => getenv('SMTP_FROM') ?: '',
    'encryption' => getenv('SMTP_ENCRYPTION') ?: 'tls',
    'recipient' => 'smv001@yandex.ru',
    'consent_version' => '2026-09-09',
    'rate_secret' => getenv('RATE_LIMIT_SECRET') ?: '',
];
