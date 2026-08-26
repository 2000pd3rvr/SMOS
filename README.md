---
title: SMOS
emoji: 🍽️
colorFrom: green
colorTo: orange
sdk: docker
pinned: false
license: mit
short_description: Multilingual voice ordering for restaurants and cafés
---

# SMOS · Smart Food Ordering System

SMOS is an AI-assisted ordering layer for restaurants and cafés. Guests can speak
or type an order in their preferred language, see an AI-generated food visual,
and send the translated order to a live kitchen/waiter dashboard.

**Current release: v0.1.5**

## Features

- Voice-to-text ordering through the browser Web Speech API
- Automatic table identification from table-specific links or QR codes
- Automatic order-language detection; no guest language selector required
- Google-backed text translation in 30+ selectable languages
- Optimised Turkish↔English ordering with Unicode-safe text handling, protected
  allergy/modifier terms, and a free MyMemory fallback
- Text-to-speech playback on both guest and staff interfaces
- Live order delivery with WebSockets
- Kitchen/waiter workflow: New → Accepted → Preparing → Ready → Served
- AI food visualisation while a guest describes a dish
- Responsive guest and operations interfaces sharing the Corner Cafe design
  system: Playfair Display/Manrope typography, crimson and gold accents, and a
  dark-first theme with a light mode toggle
- SQLite order persistence
- Docker deployment for Hugging Face Spaces or any container host

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 7860
```

Open <http://localhost:7860>. Use the **Guest** and **Kitchen & waiters** controls
to switch interfaces.

For table-aware ordering, encode a table-specific URL in each QR/NFC tag:

```text
https://your-smos-host.example/?table=T-12
```

SMOS reads and preserves that table ID automatically. Without one, it creates a
stable `DEMO-xxxxxx` ID for local demonstrations.

## Docker

```bash
docker build -t smos .
docker run --rm -p 7860:7860 -v smos-data:/data smos
```

## Integrating into a restaurant system

The application exposes JSON endpoints under `/api`:

- `POST /api/translate` — translate guest or staff text
- `POST /api/orders` — submit an order
- `GET /api/orders?language=en` — retrieve translated orders
- `PATCH /api/orders/{id}` — update an order's workflow status
- `GET /api/image` — create a food visualisation URL
- `WS /ws` — receive live order events

FastAPI's interactive API documentation is available at `/docs`.

## Production notes

This release is a deployable MVP. Before handling real payments or sensitive
customer data, add staff authentication, role-based access, a managed database,
rate limiting, audit logs, menu/POS integration, and explicit allergy
confirmation. Browser voice recognition varies by browser and operating system.
Food images are illustrative and may not match the kitchen's final presentation.

## Versioning and deployment

SMOS uses semantic versions. Every subsequent deployment must increment the
version in `app.py` and this README (for example `v0.1.1`, then `v0.1.2`) and
receive a matching Git tag.
## Profiles

- **WordPress:** https://deborahakuokominka.wordpress.com/
- **about.me:** https://about.me/deborah_akuoko_minka_ama
- **ORCID:** https://orcid.org/0009-0008-6219-154X
- **GitHub:** https://github.com/2000pd3rvr
- **GitLab:** https://gitlab.com/2000pd3rvr
- **GitHub Pages hub:** https://2000pd3rvr.github.io/ama-profile/
- **Streamlit apps hub:** https://streamlit-apps-hub.streamlit.app/
- **Render live apps:** https://deborahakuokominka.wordpress.com/#render-apps
- **Google Scholar:** https://scholar.google.co.uk/citations?hl=en&user=ab0EyjYAAAAJ

## WordPress articles

- [Spatial vs. time-resolved images](https://deborahakuokominka.wordpress.com/2026/08/22/spatial-vs-time-resolved-images-2/)
- [Time-of-flight sensors guide](https://deborahakuokominka.wordpress.com/2026/08/22/time-of-flight-sensors-guide/)

