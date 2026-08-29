import asyncio
import hashlib
import json
import logging
from typing import Optional
from urllib.parse import unquote

import redis.asyncio as redis_async
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlmodel import Session, select

from . import models
from .db import engine
from .settings import settings


logger = logging.getLogger(__name__)

table_connections: dict[int, set[WebSocket]] = {}
tenant_connections: dict[int, set[WebSocket]] = {}
public_queue_connections: dict[str, set[WebSocket]] = {}
MAX_PUBLIC_QUEUE_CONNECTIONS_PER_TOKEN = 5


def _validate_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        tenant_id = payload.get("tenant_id")
        if tenant_id is None:
            return None
        return {"tenant_id": tenant_id, "email": payload.get("sub")}
    except JWTError:
        return None


def _validate_table_token(table_token: str) -> Optional[dict]:
    with Session(engine) as session:
        table = session.exec(
            select(models.Table).where(models.Table.token == table_token)
        ).first()
        if not table:
            return None
        return {"table_id": table.id, "tenant_id": table.tenant_id}


def public_queue_token_fingerprint(public_token: str) -> str:
    """Return a non-reversible channel key; raw capability tokens never enter Redis channels."""

    return hashlib.sha256(public_token.encode("utf-8")).hexdigest()[:32]


def _validate_public_queue_token(public_token: str) -> Optional[dict]:
    if not public_token or len(public_token) > 64:
        return None
    with Session(engine) as session:
        entry = session.exec(
            select(models.GuestQueueEntry).where(
                models.GuestQueueEntry.public_token == public_token
            )
        ).first()
        if not entry:
            return None
        return {
            "queue_entry_id": entry.id,
            "fingerprint": public_queue_token_fingerprint(public_token),
        }


def _get_ws_token(websocket: WebSocket) -> Optional[str]:
    query_string = websocket.scope.get("query_string", b"").decode(
        "utf-8", errors="replace"
    )
    if query_string:
        for part in query_string.split("&"):
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            if key.strip().lower() == "token":
                return unquote(value.strip()) or None
    return websocket.cookies.get("access_token")


async def _redis_listener(stop_event: asyncio.Event) -> None:
    redis_url = settings.rate_limit_redis_url or ""
    if not redis_url:
        redis_url = getattr(settings, "redis_url", "") or ""
    if not redis_url:
        redis_url = "redis://localhost:6379"

    while not stop_event.is_set():
        client = None
        pubsub = None
        try:
            client = redis_async.from_url(redis_url)
            pubsub = client.pubsub()
            await pubsub.psubscribe(
                "orders:table:*",
                "orders:tenant:*",
                "reservations:tenant:*",
                "queue:tenant:*",
                "queue:public:*",
            )

            while not stop_event.is_set():
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if not message or message.get("type") != "pmessage":
                    continue

                channel = message["channel"]
                data = message["data"]
                if isinstance(channel, bytes):
                    channel = channel.decode()
                if isinstance(data, bytes):
                    data = data.decode()

                parts = channel.split(":")
                if len(parts) != 3:
                    continue

                channel_type = parts[1]
                entity_key = parts[2]
                dead_connections: set[WebSocket] = set()

                if channel_type == "table":
                    entity_id = int(entity_key)
                    for ws in table_connections.get(entity_id, set()):
                        try:
                            await ws.send_text(data)
                        except Exception:
                            dead_connections.add(ws)
                    if entity_id in table_connections:
                        table_connections[entity_id] -= dead_connections
                        if not table_connections[entity_id]:
                            del table_connections[entity_id]
                elif channel_type == "tenant":
                    entity_id = int(entity_key)
                    for ws in tenant_connections.get(entity_id, set()):
                        try:
                            await ws.send_text(data)
                        except Exception:
                            dead_connections.add(ws)
                    if entity_id in tenant_connections:
                        tenant_connections[entity_id] -= dead_connections
                        if not tenant_connections[entity_id]:
                            del tenant_connections[entity_id]
                elif channel_type == "public":
                    is_terminal = False
                    try:
                        is_terminal = bool(json.loads(data).get("terminal"))
                    except (TypeError, ValueError, json.JSONDecodeError):
                        pass
                    for ws in public_queue_connections.get(entity_key, set()):
                        try:
                            await ws.send_text(data)
                            if is_terminal:
                                await ws.close(code=1000, reason="Queue entry closed")
                                dead_connections.add(ws)
                        except Exception:
                            dead_connections.add(ws)
                    if entity_key in public_queue_connections:
                        public_queue_connections[entity_key] -= dead_connections
                        if not public_queue_connections[entity_key]:
                            del public_queue_connections[entity_key]
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("WebSocket bridge Redis listener error: %s", exc, exc_info=True)
            await asyncio.sleep(5)
        finally:
            if pubsub is not None:
                try:
                    await pubsub.close()
                except Exception:
                    pass
            if client is not None:
                try:
                    await client.aclose()
                except Exception:
                    pass


def start_websocket_bridge(app: FastAPI) -> None:
    stop_event = asyncio.Event()
    task = asyncio.create_task(_redis_listener(stop_event))
    app.state.ws_bridge_stop = stop_event
    app.state.ws_bridge_task = task
    logger.info("WebSocket bridge listener started")


async def stop_websocket_bridge(app: FastAPI) -> None:
    stop_event = getattr(app.state, "ws_bridge_stop", None)
    task = getattr(app.state, "ws_bridge_task", None)
    if stop_event:
        stop_event.set()
    if task and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    logger.info("WebSocket bridge listener stopped")


def register_websocket_routes(app: FastAPI) -> None:
    @app.websocket("/ws/table/{table_token}")
    @app.websocket("/table/{table_token}")
    async def websocket_table_endpoint(websocket: WebSocket, table_token: str) -> None:
        await websocket.accept()

        table_info = _validate_table_token(table_token)
        if not table_info:
            await websocket.close(code=1008, reason="Invalid table token")
            return

        table_id = table_info["table_id"]
        table_connections.setdefault(table_id, set()).add(websocket)

        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            if table_id in table_connections:
                table_connections[table_id].discard(websocket)
                if not table_connections[table_id]:
                    del table_connections[table_id]

    @app.websocket("/ws/tenant/{tenant_id}")
    @app.websocket("/tenant/{tenant_id}")
    async def websocket_tenant_endpoint(websocket: WebSocket, tenant_id: int) -> None:
        await websocket.accept()

        token = _get_ws_token(websocket)
        if not token:
            await websocket.close(code=1008, reason="Missing authentication token")
            return

        token_info = _validate_jwt_token(token)
        if not token_info:
            await websocket.close(code=1008, reason="Invalid authentication token")
            return

        if token_info["tenant_id"] != tenant_id:
            await websocket.close(code=1008, reason="Tenant ID mismatch")
            return

        tenant_connections.setdefault(tenant_id, set()).add(websocket)

        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            if tenant_id in tenant_connections:
                tenant_connections[tenant_id].discard(websocket)
                if not tenant_connections[tenant_id]:
                    del tenant_connections[tenant_id]

    @app.websocket("/ws/public/queue")
    @app.websocket("/public/queue")
    async def websocket_public_queue_endpoint(websocket: WebSocket) -> None:
        await websocket.accept()

        try:
            authentication = json.loads(
                await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
            )
            public_token = authentication.get("token", "")
        except (asyncio.TimeoutError, TypeError, ValueError, json.JSONDecodeError):
            await websocket.close(code=1008, reason="Missing queue token")
            return

        queue_info = _validate_public_queue_token(public_token)
        if not queue_info:
            await websocket.close(code=1008, reason="Invalid queue token")
            return

        fingerprint = queue_info["fingerprint"]
        connections = public_queue_connections.setdefault(fingerprint, set())
        if len(connections) >= MAX_PUBLIC_QUEUE_CONNECTIONS_PER_TOKEN:
            await websocket.close(code=1013, reason="Too many queue connections")
            return
        connections.add(websocket)
        await websocket.send_text(json.dumps({"type": "queue_connected"}))

        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            if fingerprint in public_queue_connections:
                public_queue_connections[fingerprint].discard(websocket)
                if not public_queue_connections[fingerprint]:
                    del public_queue_connections[fingerprint]

    @app.get("/ws/health")
    def websocket_bridge_health() -> dict:
        table_count = sum(len(connections) for connections in table_connections.values())
        tenant_count = sum(
            len(connections) for connections in tenant_connections.values()
        )
        public_queue_count = sum(
            len(connections) for connections in public_queue_connections.values()
        )
        return {
            "status": "ok",
            "table_connections": table_count,
            "tenant_connections": tenant_count,
            "public_queue_connections": public_queue_count,
            "total_connections": table_count + tenant_count + public_queue_count,
        }
