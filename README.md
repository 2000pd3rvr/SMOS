# SmOS

AI powered online ordering system, customisable for restaurants and other merchants.

SmOS is a modular restaurant tech stack: a shared platform core plus merchant-specific modules. Each module can own branding, menu, fulfilment modes (delivery, collection, sit-in), and ordering UX — including browse-the-menu and natural-language “I know what I want” flows.

## Explore modules

| Module | Merchant | Description |
|--------|----------|-------------|
| **SmOS_CC** | The Corner Cafe (Dalkeith) | Custom ordering experience — service mode, menu browse, AI dish matching |

## Local

```bash
# Platform + modules (static)
python3 -m http.server 8877
# Home:     http://127.0.0.1:8877/
# SmOS_CC:  http://127.0.0.1:8877/modules/SmOS_CC/

# Optional: FastAPI voice / kitchen layer (legacy core on port 7860)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 7860
```

## Layout

```text
index.html              Platform home
styles.css / site.js    Platform chrome (Explore modules)
modules/SmOS_CC/        Corner Cafe customisation
static/                 Legacy voice + kitchen UI (served by FastAPI)
app.py                  API + WebSocket kitchen workflow
```

## Remotes

<<<<<<< HEAD
- GitHub: https://github.com/2000pd3rvr/SMOS
- Hugging Face Space: https://huggingface.co/spaces/0001AMA/SMOS
=======
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

>>>>>>> 2057bab1518fe50e0c797eb0386b6ab305b9afac
