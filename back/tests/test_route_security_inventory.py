"""Fail closed when a new API route is added without an authentication review.

This is a structural guard, not a replacement for resource-level IDOR tests. Any
route without an authentication dependency must be deliberately added to the
public/token-authenticated inventory below during code review.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from app.main import app


AUTH_DEPENDENCY_NAMES = {
    "get_current_user",
    "get_current_provider",
    "get_current_courier",
    "require_permission_dependency",
    "require_role_dependency",
    "verify_internal_ws_bridge_secret",
}


# Public and capability-token routes are intentionally unauthenticated. Their
# tenant boundary is a path tenant id, a signed table/queue/reservation token, or
# an external webhook signature, and each family has dedicated regression tests.
REVIEWED_PUBLIC_ROUTES = {
    ("GET", "/ws/health"),
    ("GET", "/uploads/{tenant_id}/logo/{filename}"),
    ("GET", "/uploads/{tenant_id}/header/{filename}"),
    ("GET", "/uploads/providers/{provider_token}/products/{filename}"),
    ("GET", "/uploads/{tenant_id}/products/{filename}"),
    ("GET", "/uploads/{tenant_id}/contracts/{filename}"),
    ("GET", "/favicon.ico"),
    ("HEAD", "/favicon.ico"),
    ("GET", "/health"),
    ("GET", "/health/db"),
    ("GET", "/public/tenants"),
    ("GET", "/public/legal-urls"),
    ("GET", "/public/tenants/{tenant_id}"),
    ("GET", "/public/tenants/{tenant_id}/queue"),
    ("POST", "/public/tenants/{tenant_id}/queue"),
    ("POST", "/public/queue/status"),
    ("POST", "/public/queue/cancel"),
    ("GET", "/public/queue/{public_token}"),
    ("POST", "/public/queue/{public_token}/cancel"),
    ("GET", "/public/tenants/{tenant_id}/menu"),
    ("GET", "/public/tenants/{tenant_id}/reservation-book-zones"),
    ("GET", "/public/table-lookup"),
    ("POST", "/public/tenants/{tenant_id}/guest-feedback"),
    ("POST", "/register"),
    ("POST", "/register/provider"),
    ("POST", "/token"),
    ("POST", "/token/otp"),
    ("POST", "/logout"),
    ("POST", "/password-reset/request"),
    ("POST", "/password-reset/confirm"),
    ("POST", "/refresh"),
    ("GET", "/users/me"),
    ("POST", "/reservations"),
    ("GET", "/reservations/book-calendar"),
    ("GET", "/reservations/book-week-slots"),
    ("GET", "/reservations/book-month-day-states"),
    ("GET", "/reservations/book-day-slots"),
    ("GET", "/reservations/next-available"),
    ("GET", "/reservations/by-token"),
    ("PUT", "/reservations/{reservation_id}/cancel"),
    ("PUT", "/reservations/{reservation_id}/public"),
    ("POST", "/internal/validate-public-queue"),
    ("GET", "/internal/validate-table/{table_token}"),
    ("GET", "/menu/{table_token}"),
    ("GET", "/menu/{table_token}/order"),
    ("GET", "/menu/{table_token}/order-history"),
    ("POST", "/menu/{table_token}/order"),
    ("POST", "/menu/{table_token}/order/{order_id}/request-payment"),
    ("POST", "/menu/{table_token}/call-waiter"),
    ("DELETE", "/menu/{table_token}/order/{order_id}/items/{item_id}"),
    ("PUT", "/menu/{table_token}/order/{order_id}/items/{item_id}"),
    ("DELETE", "/menu/{table_token}/order/{order_id}"),
    ("POST", "/orders/{order_id}/create-hitpay-payment-request"),
    ("POST", "/orders/{order_id}/confirm-hitpay-payment"),
    ("POST", "/payments/hitpay/webhook"),
}


def _dependency_names(route: APIRoute) -> set[str]:
    names: set[str] = set()

    def walk(dependant) -> None:
        call = getattr(dependant, "call", None)
        if call is not None:
            names.add(getattr(call, "__name__", str(call)))
        for child in getattr(dependant, "dependencies", ()):  # pragma: no branch
            walk(child)

    walk(route.dependant)
    return names


def test_every_api_route_is_authenticated_or_explicitly_reviewed_public() -> None:
    unreviewed: list[tuple[str, str]] = []
    observed_public: set[tuple[str, str]] = set()

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        dependency_names = _dependency_names(route)
        protected = bool(dependency_names & AUTH_DEPENDENCY_NAMES)
        for method in route.methods:
            identity = (method, route.path)
            if protected:
                continue
            observed_public.add(identity)
            if identity not in REVIEWED_PUBLIC_ROUTES:
                unreviewed.append(identity)

    assert not unreviewed, (
        "New unauthenticated routes require a security review and an explicit "
        f"inventory entry: {sorted(unreviewed)}"
    )
    assert REVIEWED_PUBLIC_ROUTES == observed_public, (
        "The reviewed public-route inventory is stale. Remove deleted routes or "
        "review dependency changes before updating it."
    )
