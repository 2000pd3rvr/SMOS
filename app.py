from __future__ import annotations

import asyncio
import json
import os
import re
import sqlite3
import unicodedata
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import quote

from deep_translator import GoogleTranslator, MyMemoryTranslator
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from langdetect import DetectorFactory, LangDetectException, detect
from pydantic import BaseModel, Field

VERSION = "0.1.5"
DetectorFactory.seed = 0
ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("SMOS_DATA_DIR", ROOT / "data"))
DB_PATH = DATA_DIR / "smos.db"

LANGUAGES = [
    {"code": "en", "name": "English", "locale": "en-GB"},
    {"code": "tr", "name": "Türkçe · Turkish — optimised", "locale": "tr-TR"},
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
    {"code": "uk", "name": "Українська · Ukrainian", "locale": "uk-UA"},
    {"code": "ur", "name": "اردو · Urdu", "locale": "ur-PK"},
    {"code": "vi", "name": "Tiếng Việt · Vietnamese", "locale": "vi-VN"},
]
LANGUAGE_CODES = {item["code"] for item in LANGUAGES}
STATUSES = {"new", "accepted", "preparing", "ready", "served", "cancelled"}

TURKISH_SAFETY_TERMS = {
    ("tr", "en"): {
        "alerjim var": ("I have an allergy", ("allergy", "allergic")),
        "glütensiz": ("gluten-free", ("gluten-free", "without gluten")),
        "laktozsuz": ("lactose-free", ("lactose-free", "without lactose")),
        "süt ürünü olmasın": ("no dairy", ("no dairy", "dairy-free", "without dairy")),
        "fıstık alerjisi": ("peanut allergy", ("peanut allergy", "allergic to peanuts")),
        "fıstık alerjim var": ("peanut allergy", ("peanut allergy", "allergic to peanuts")),
        "fıstığa alerjim var": ("peanut allergy", ("peanut allergy", "allergic to peanuts")),
        "kuruyemiş alerjisi": ("nut allergy", ("nut allergy", "allergic to nuts")),
        "kuruyemişe alerjim var": ("nut allergy", ("nut allergy", "allergic to nuts")),
        "domuz eti olmasın": ("no pork", ("no pork", "without pork")),
        "soğansız": ("no onion", ("no onion", "without onion", "onion-free")),
        "sarımsaksız": ("no garlic", ("no garlic", "without garlic", "garlic-free")),
        "acısız": ("not spicy", ("not spicy", "non-spicy", "without spice")),
    },
    ("en", "tr"): {
        "i have an allergy": ("alerjim var", ("alerjim var", "alerjim bulunuyor")),
        "gluten-free": ("glütensiz", ("glütensiz", "glutensiz")),
        "lactose-free": ("laktozsuz", ("laktozsuz",)),
        "no dairy": ("süt ürünü olmasın", ("süt ürünü olmasın", "süt ürünsüz")),
        "peanut allergy": (
            "fıstık alerjisi",
            ("fıstık alerjisi", "fıstığa alerjim var", "yer fıstığına alerjim var"),
        ),
        "nut allergy": ("kuruyemiş alerjisi", ("kuruyemiş alerjisi",)),
        "no pork": ("domuz eti olmasın", ("domuz eti olmasın", "domuz etsiz")),
        "no onion": ("soğansız", ("soğansız", "soğan olmasın")),
        "no garlic": ("sarımsaksız", ("sarımsaksız", "sarımsak olmasın")),
        "not spicy": ("acısız", ("acısız", "acı olmasın", "baharatlı değil")),
    },
}


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


def normalise_translation_input(text: str, source: str) -> str:
    normalised = unicodedata.normalize("NFC", text).replace("’", "'").replace("`", "'")
    normalised = " ".join(normalised.split())
    if source == "tr":
        # Preserve dotted/dotless Turkish characters instead of ASCII-folding them.
        normalised = normalised.replace("İ", "İ")
    return normalised


def infer_source_language(text: str, requested: str = "auto") -> str:
    if requested in LANGUAGE_CODES:
        return requested
    lowered = unicodedata.normalize("NFC", text).casefold()
    turkish_markers = (
        "ç",
        "ğ",
        "ı",
        "ö",
        "ş",
        "ü",
        " istiyorum",
        " olsun",
        " olmasın",
        " lütfen",
    )
    if any(marker in lowered for marker in turkish_markers):
        return "tr"
    try:
        detected = detect(text)
        aliases = {"zh-cn": "zh-CN", "zh-tw": "zh-CN"}
        detected = aliases.get(detected, detected)
        if detected in LANGUAGE_CODES:
            return detected
    except LangDetectException:
        pass
    return "auto"


def preserve_turkish_safety_terms(
    source_text: str, translated_text: str, source: str, target: str
) -> str:
    terms = TURKISH_SAFETY_TERMS.get((source, target), {})
    source_lower = source_text.casefold()
    translated_lower = translated_text.casefold()
    missing: list[str] = []
    for phrase, (canonical, accepted) in terms.items():
        source_has_phrase = re.search(
            rf"(?<!\w){re.escape(phrase)}(?!\w)", source_lower, flags=re.UNICODE
        )
        translation_has_term = any(
            re.search(
                rf"(?<!\w){re.escape(term.casefold())}(?!\w)",
                translated_lower,
                flags=re.UNICODE,
            )
            for term in accepted
        )
        if source_has_phrase and not translation_has_term:
            missing.append(canonical)
    if not missing:
        return translated_text
    label = "Order note" if target == "en" else "Sipariş notu"
    return f"{translated_text} — {label}: {', '.join(missing)}"


def correct_turkish_restaurant_context(
    source_text: str, translated_text: str, source: str, target: str
) -> str:
    if source == "tr" and target == "en" and "acısız" in source_text.casefold():
        # Generic translators can read "acı" as pain; on a food order it means spice/heat.
        translated_text = re.sub(
            r"\b(?:without\s+pain|no\s+pain|pain[\s-]?free|painless)\b",
            "not spicy",
            translated_text,
            flags=re.IGNORECASE,
        )
    return translated_text


def google_translate(text: str, source: str, target: str) -> str:
    if not text.strip() or source == target:
        return text
    source = infer_source_language(text, source)
    source_code = "auto" if source not in LANGUAGE_CODES else source
    normalised = normalise_translation_input(text, source)
    try:
        translated = GoogleTranslator(source=source_code, target=target).translate(normalised)
    except Exception:
        try:
            memory_codes = {
                "en": "en-GB",
                "tr": "tr-TR",
            }
            translated = MyMemoryTranslator(
                source=memory_codes.get(source, source),
                target=memory_codes.get(target, target),
            ).translate(normalised)
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail="Translation is temporarily unavailable. Please retry.",
            ) from exc
    if {source, target} == {"en", "tr"}:
        translated = correct_turkish_restaurant_context(normalised, translated, source, target)
        translated = preserve_turkish_safety_terms(normalised, translated, source, target)
    return translated


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
    table_number: str = Field(
        default_factory=lambda: f"AUTO-{uuid.uuid4().hex[:6].upper()}",
        min_length=1,
        max_length=30,
    )
    order_text: str = Field(min_length=2, max_length=1500)
    language: str = "auto"


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
    detected_source = infer_source_language(payload.text, payload.source)
    translated = await translate(payload.text, detected_source, payload.target)
    return {"translated_text": translated, "source": detected_source, "target": payload.target}


@app.post("/api/orders", status_code=201)
async def create_order(payload: OrderCreate) -> dict:
    if payload.language != "auto" and payload.language not in LANGUAGE_CODES:
        raise HTTPException(status_code=400, detail="Unsupported order language.")

    detected_language = infer_source_language(payload.order_text, payload.language)
    kitchen_text = await translate(payload.order_text, detected_language, "en")
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
                detected_language,
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
