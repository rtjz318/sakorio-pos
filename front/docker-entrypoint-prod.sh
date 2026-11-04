#!/bin/sh
set -e

# Get API and WS URLs from environment variables, with defaults
# In production, we prefer relative URLs handled by index.html defaults
API_URL="${API_URL:-}"
WS_URL="${WS_URL:-}"
TENANT_ID="${SAKORIO_TENANT_ID:-}"
PORTAL_MODE="${SAKORIO_PORTAL_MODE:-}"
PUBLIC_ORDER_ORIGIN="${SAKORIO_PUBLIC_ORDER_ORIGIN:-}"

# Escape special characters for sed (slashes, ampersands, etc.)
# We only do this if the variables are not empty
if [ -n "$API_URL" ]; then
    API_URL_ESCAPED=$(echo "$API_URL" | sed 's/[\/&]/\\&/g')
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__API_URL__ = .*#window.__API_URL__ = '${API_URL_ESCAPED}';#g" {} \;
fi

if [ -n "$WS_URL" ]; then
    WS_URL_ESCAPED=$(echo "$WS_URL" | sed 's/[\/&]/\\&/g')
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__WS_URL__ = .*#window.__WS_URL__ = '${WS_URL_ESCAPED}';#g" {} \;
fi

if [ -n "$TENANT_ID" ]; then
    case "$TENANT_ID" in
        *[!0-9]*|'') echo "Invalid SAKORIO_TENANT_ID: expected a positive integer" >&2; exit 1 ;;
    esac
    if [ "$TENANT_ID" -le 0 ]; then
        echo "Invalid SAKORIO_TENANT_ID: expected a positive integer" >&2
        exit 1
    fi
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__TENANT_ID__ = .*#window.__TENANT_ID__ = ${TENANT_ID};#g" {} \;
fi

if [ -n "$PORTAL_MODE" ]; then
    case "$PORTAL_MODE" in
        shared|customer|staff|management) ;;
        *) echo "Invalid SAKORIO_PORTAL_MODE: use shared, customer, staff, or management" >&2; exit 1 ;;
    esac
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__PORTAL_MODE__ = .*#window.__PORTAL_MODE__ = '${PORTAL_MODE}';#g" {} \;
fi

if [ -n "$PUBLIC_ORDER_ORIGIN" ]; then
    PUBLIC_ORDER_ORIGIN_ESCAPED=$(echo "$PUBLIC_ORDER_ORIGIN" | sed 's/[\/&]/\\&/g')
    find /usr/share/nginx/html -name "index.html" -exec sed -i "s#window.__PUBLIC_ORDER_ORIGIN__ = .*#window.__PUBLIC_ORDER_ORIGIN__ = '${PUBLIC_ORDER_ORIGIN_ESCAPED}';#g" {} \;
fi

# Execute the original command
exec "$@"
