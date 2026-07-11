import asyncio
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
                entity_id = int(parts[2])
                dead_connections: set[WebSocket] = set()

                if channel_type == "table":
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
                    for ws in tenant_connections.get(entity_id, set()):
                        try:
                            await ws.send_text(data)
                        except Exception:
                            dead_connections.add(ws)
                    if entity_id in tenant_connections:
                        tenant_connections[entity_id] -= dead_connections
                        if not tenant_connections[entity_id]:
                            del tenant_connections[entity_id]
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

    @app.get("/ws/health")
    def websocket_bridge_health() -> dict:
        table_count = sum(len(connections) for connections in table_connections.values())
        tenant_count = sum(
            len(connections) for connections in tenant_connections.values()
        )
        return {
            "status": "ok",
            "table_connections": table_count,
            "tenant_connections": tenant_count,
            "total_connections": table_count + tenant_count,
        }
