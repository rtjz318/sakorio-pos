from app.models import User, UserRole
from app.permissions import (
    Permission,
    can_manage_user,
    can_modify_user,
    has_permission,
)


def _user(user_id: int, role: UserRole) -> User:
    return User(
        id=user_id,
        email=f"{role.value}-{user_id}@example.com",
        hashed_password="not-used",
        role=role,
        tenant_id=1,
    )


def test_cashier_waiter_can_operate_pos_but_not_administer_tenant() -> None:
    cashier = _user(1, UserRole.waiter)

    for permission in (
        Permission.PRODUCT_READ,
        Permission.TABLE_READ,
        Permission.TABLE_ACTIVATE,
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE_STATUS,
        Permission.ORDER_MARK_PAID,
        Permission.ORDER_REMOVE_ITEM,
    ):
        assert has_permission(cashier, permission)

    for permission in (
        Permission.PRODUCT_WRITE,
        Permission.TABLE_WRITE,
        Permission.SETTINGS_UPDATE,
        Permission.REPORT_READ,
        Permission.USER_CREATE,
        Permission.USER_DELETE,
    ):
        assert not has_permission(cashier, permission)


def test_receptionist_and_waiter_share_small_outlet_operator_access() -> None:
    host = _user(2, UserRole.receptionist)
    cashier = _user(3, UserRole.waiter)

    for permission in Permission:
        assert has_permission(host, permission) == has_permission(cashier, permission)

    for permission in (
        Permission.ORDER_UPDATE_STATUS,
        Permission.ORDER_ITEM_STATUS,
        Permission.ORDER_MARK_PAID,
        Permission.ORDER_REMOVE_ITEM,
    ):
        assert has_permission(host, permission)

    for permission in (
        Permission.PRODUCT_WRITE,
        Permission.SETTINGS_UPDATE,
        Permission.REPORT_READ,
    ):
        assert not has_permission(host, permission)


def test_kitchen_can_progress_items_without_floor_or_payment_access() -> None:
    kitchen = _user(3, UserRole.kitchen)

    assert has_permission(kitchen, Permission.PRODUCT_READ)
    assert has_permission(kitchen, Permission.ORDER_READ)
    assert has_permission(kitchen, Permission.ORDER_ITEM_STATUS)

    for permission in (
        Permission.TABLE_READ,
        Permission.RESERVATION_READ,
        Permission.ORDER_UPDATE_STATUS,
        Permission.ORDER_MARK_PAID,
        Permission.SETTINGS_UPDATE,
    ):
        assert not has_permission(kitchen, permission)


def test_admin_and_owner_boundaries_are_preserved() -> None:
    owner = _user(10, UserRole.owner)
    admin = _user(11, UserRole.admin)

    assert all(has_permission(owner, permission) for permission in Permission)
    assert has_permission(admin, Permission.REPORT_READ)
    assert has_permission(admin, Permission.INVENTORY_WRITE)
    assert has_permission(admin, Permission.USER_UPDATE)
    assert not has_permission(admin, Permission.SETTINGS_BILLING)
    assert not has_permission(admin, Permission.USER_DELETE)


def test_user_management_hierarchy() -> None:
    owner = _user(20, UserRole.owner)
    admin = _user(21, UserRole.admin)
    cashier = _user(22, UserRole.waiter)
    host = _user(23, UserRole.receptionist)

    assert can_manage_user(owner, UserRole.owner)
    assert can_manage_user(owner, UserRole.waiter)
    assert not can_manage_user(admin, UserRole.owner)
    assert can_manage_user(admin, UserRole.waiter)
    assert not can_manage_user(cashier, UserRole.receptionist)

    assert can_modify_user(owner, admin)
    assert not can_modify_user(admin, owner)
    assert can_modify_user(admin, cashier)
    assert can_modify_user(cashier, cashier)
    assert not can_modify_user(cashier, host)
