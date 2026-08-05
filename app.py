from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import quote

from deep_translator import GoogleTranslator
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

VERSION = "0.1.0"
ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("SMOS_DATA_DIR", ROOT / "data"))
DB_PATH = DATA_DIR / "smos.db"

LANGUAGES = [
    {"code": "en", "name": "English", "locale": "en-GB"},
    {"code": "ar", "name": "العربية · Arabic", "locale": "ar-SA"},
    {"code": "bn", "name": "বাংলা · Bengali", "locale": "bn-BD"},
    {"code": "zh-CN", "name": "中文 · Chinese", "locale": "zh-CN"},
    {"code": "cs", "name": "Čeština · Czech", "locale": "cs-CZ"},
    {"code": "da", "name": "Dansk · Danish", "locale": "da-DK"},
    {"code": "nl", "name": "Nederlands · Dutch", "locale": "nl-NL"},
    {"code": "fi", "name": "Suomi · Finnish", "locale": "fi-FI"},
    {"code": "fr", "name": "Français · French", "locale": "fr-FR"},
    {"code": "de", "name": "Deutsch · German", "locale": "de-DE"},
    {"code": "el", "name": "Ελληνικά · Greek", "locale": "el-GR"},
    {"code": "hi", "name": "हिन्दी · Hindi", "locale": "hi-IN"},
    {"code": "hu", "name": "Magyar · Hungarian", "locale": "hu-HU"},
    {"code": "id", "name": "Bahasa Indonesia", "locale": "id-ID"},
    {"code": "it", "name": "Italiano · Italian", "locale": "it-IT"},
    {"code": "ja", "name": "日本語 · Japanese", "locale": "ja-JP"},
    {"code": "ko", "name": "한국어 · Korean", "locale": "ko-KR"},
    {"code": "ms", "name": "Bahasa Melayu · Malay", "locale": "ms-MY"},
    {"code": "no", "name": "Norsk · Norwegian", "locale": "nb-NO"},
    {"code": "pl", "name": "Polski · Polish", "locale": "pl-PL"},
    {"code": "pt", "name": "Português · Portuguese", "locale": "pt-PT"},
    {"code": "ro", "name": "Română · Romanian", "locale": "ro-RO"},
    {"code": "ru", "name": "Русский · Russian", "locale": "ru-RU"},
    {"code": "es", "name": "Español · Spanish", "locale": "es-ES"},
    {"code": "sw", "name": "Kiswahili · Swahili", "locale": "sw-KE"},
    {"code": "sv", "name": "Svenska · Swedish", "locale": "sv-SE"},
    {"code": "ta", "name": "தமிழ் · Tamil", "locale": "ta-IN"},
    {"code": "th", "name": "ไทย · Thai", "locale": "th-TH"},
    {"code": "tr", "name": "Türkçe · Turkish", "locale": "tr-TR"},
    {"code": "uk", "name": "Українська · Ukrainian", "locale": "uk-UA"},
    {"code": "ur", "name": "اردو · Urdu", "locale": "ur-PK"},
    {"code": "vi", "name": "Tiếng Việt · Vietnamese", "locale": "vi-VN"},
]
LANGUAGE_CODES = {item["code"] for item in LANGUAGES}
STATUSES = {"new", "accepted", "preparing", "ready", "served", "cancelled"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                order_number INTEGER NOT NULL,
                customer_name TEXT NOT NULL,
                table_number TEXT NOT NULL,
                original_text TEXT NOT NULL,
                original_language TEXT NOT NULL,
                kitchen_text TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS translations (
                order_id TEXT NOT NULL,
                language TEXT NOT NULL,
                text TEXT NOT NULL,
                PRIMARY KEY (order_id, language)
            )
            """
        )


def google_translate(text: str, source: str, target: str) -> str:
    if not text.strip() or source == target:
        return text
    source_code = "auto" if source not in LANGUAGE_CODES else source
    try:
        return GoogleTranslator(source=source_code, target=target).translate(text)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Translation is temporarily unavailable. Please retry.",
        ) from exc


async def translate(text: str, source: str, target: str) -> str:
    return await asyncio.to_thread(google_translate, text, source, target)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, event: dict) -> None:
        stale: list[WebSocket] = []
        for connection in self.connections:
            try:
                await connection.send_json(event)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


manager = ConnectionManager()


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    source: str = "auto"
    target: str


class OrderCreate(BaseModel):
    customer_name: str = Field(default="Guest", min_length=1, max_length=80)
    table_number: str = Field(min_length=1, max_length=30)
    order_text: str = Field(min_length=2, max_length=1500)
    language: str = "en"


class OrderStatusUpdate(BaseModel):
    status: Literal["new", "accepted", "preparing", "ready", "served", "cancelled"]


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title="SMOS · Smart Food Ordering System", version=VERSION, lifespan=lifespan)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
async def home() -> FileResponse:
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/config")
async def config() -> dict:
    return {"name": "SMOS", "version": VERSION, "languages": LANGUAGES}


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "version": VERSION}


@app.post("/api/translate")
async def translate_text(payload: TranslationRequest) -> dict:
    if payload.target not in LANGUAGE_CODES:
        raise HTTPException(status_code=400, detail="Unsupported target language.")
    translated = await translate(payload.text, payload.source, payload.target)
    return {"translated_text": translated, "source": payload.source, "target": payload.target}


@app.post("/api/orders", status_code=201)
async def create_order(payload: OrderCreate) -> dict:
    if payload.language not in LANGUAGE_CODES:
        raise HTTPException(status_code=400, detail="Unsupported order language.")

    kitchen_text = await translate(payload.order_text, payload.language, "en")
    order_id = str(uuid.uuid4())
    now = utc_now()
    with connect() as db:
        number = db.execute("SELECT COALESCE(MAX(order_number), 100) + 1 FROM orders").fetchone()[0]
        db.execute(
            """
            INSERT INTO orders (
                id, order_number, customer_name, table_number, original_text,
                original_language, kitchen_text, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
            """,
            (
                order_id,
                number,
                payload.customer_name.strip(),
                payload.table_number.strip(),
                payload.order_text.strip(),
                payload.language,
                kitchen_text,
                now,
                now,
            ),
        )
        row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    order = row_to_dict(row)
    await manager.broadcast({"type": "order.created", "order": order})
    return order


@app.get("/api/orders")
async def list_orders(
    language: str = Query(default="en"),
    include_closed: bool = Query(default=True),
) -> list[dict]:
    if language not in LANGUAGE_CODES:
        raise HTTPException(status_code=400, detail="Unsupported display language.")
    sql = "SELECT * FROM orders"
    params: tuple = ()
    if not include_closed:
        sql += " WHERE status NOT IN (?, ?)"
        params = ("served", "cancelled")
    sql += " ORDER BY created_at DESC LIMIT 100"
    with connect() as db:
        rows = db.execute(sql, params).fetchall()

    orders = [row_to_dict(row) for row in rows]
    for order in orders:
        if language == "en":
            order["display_text"] = order["kitchen_text"]
            continue
        with connect() as db:
            cached = db.execute(
                "SELECT text FROM translations WHERE order_id = ? AND language = ?",
                (order["id"], language),
            ).fetchone()
        if cached:
            order["display_text"] = cached["text"]
        else:
            translated = await translate(order["kitchen_text"], "en", language)
            order["display_text"] = translated
            with connect() as db:
                db.execute(
                    "INSERT OR REPLACE INTO translations (order_id, language, text) VALUES (?, ?, ?)",
                    (order["id"], language, translated),
                )
    return orders


@app.patch("/api/orders/{order_id}")
async def update_order(order_id: str, payload: OrderStatusUpdate) -> dict:
    if payload.status not in STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status.")
    now = utc_now()
    with connect() as db:
        cursor = db.execute(
            "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
            (payload.status, now, order_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Order not found.")
        row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    order = row_to_dict(row)
    await manager.broadcast({"type": "order.updated", "order": order})
    return order


@app.get("/api/image")
async def image_url(
    description: str = Query(min_length=2, max_length=500),
    language: str = Query(default="en"),
) -> dict:
    english_description = await translate(description, language, "en")
    prompt = (
        "professional appetizing restaurant food photography, plated dish, "
        f"{english_description}, warm natural light, realistic, no text, no logo"
    )
    url = (
        f"https://image.pollinations.ai/prompt/{quote(prompt, safe='')}"
        "?width=768&height=512&nologo=true&enhance=true"
    )
    return {"url": url, "prompt": english_description}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
