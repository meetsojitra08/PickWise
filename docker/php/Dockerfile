# Laravel 13 requires PHP >= 8.3 (8.4 is actively supported and supports PECL phpredis + opcache)
FROM php:8.4-fpm-alpine

WORKDIR /var/www/html

# Runtime dependencies required by PHP extensions and Laravel tooling
RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-libs \
    libpq \
    libzip \
    unzip

# Build dependencies are grouped in .build-deps and removed after compilation
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev \
    libzip-dev \
    linux-headers \
    postgresql-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        opcache \
        pcntl \
        pdo_pgsql \
        pgsql \
        zip \
    && pecl update-channels \
    && pecl install -o -f redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /tmp/pear

# Copy Composer v2 binary from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Sensible PHP defaults for local API development and image uploads
RUN { \
    echo 'memory_limit=256M'; \
    echo 'upload_max_filesize=10M'; \
    echo 'post_max_size=12M'; \
    echo 'opcache.enable=1'; \
    echo 'opcache.validate_timestamps=1'; \
    echo 'opcache.revalidate_freq=0'; \
} > /usr/local/etc/php/conf.d/pickwise.ini

EXPOSE 9000

CMD ["php-fpm"]
