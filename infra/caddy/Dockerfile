# Caddy with two plugins: rate limits and the Cloudflare DNS provider (for TLS_MODE=cloudflare).
# Build from the infra/caddy folder: docker build -t nepnha-caddy infra/caddy
# Versions are pinned, so a new upstream release cannot break a deploy of main. Update them on purpose.

FROM caddy:2.11.8-builder AS build
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit@v0.1.0 \
    --with github.com/caddy-dns/cloudflare@v0.2.4

FROM caddy:2.11.8-alpine
COPY --from=build /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
# A broken Caddyfile fails the build, for both TLS modes. The token is a fake one of the right shape: the
# plugin checks only its form here.
RUN SITE_HOST=localhost caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
 && SITE_HOST=example.com TLS_MODE=cloudflare CLOUDFLARE_API_TOKEN=buildcheck0000000000000000000000000000000 \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
