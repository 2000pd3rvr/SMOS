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

- GitHub: https://github.com/2000pd3rvr/SMOS
- Hugging Face Space: https://huggingface.co/spaces/0001AMA/SMOS
