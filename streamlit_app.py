#!/usr/bin/env python3
"""SMOS — same static front end as the Hugging Face Space."""

from __future__ import annotations

from pathlib import Path

import streamlit as st

from streamlit_static import render_live_site

ROOT = Path(__file__).resolve().parent
# Prefer HF-style root index.html; fall back to static/index.html
HTML = ROOT / "index.html"
if not HTML.is_file():
    HTML = ROOT / "static" / "index.html"

st.set_page_config(
    page_title="SMOS · Deborah Akuoko Minka",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ABOUT = """
**SMOS** takes spoken or typed food orders across languages and passes them into a kitchen workflow.

- **Source (GitLab):** [gitlab.com/2000pd3rvr/SMOS](https://gitlab.com/2000pd3rvr/SMOS)
- **GitHub mirror (Streamlit deploy):** [github.com/2000pd3rvr/SMOS](https://github.com/2000pd3rvr/SMOS)
- **Also on Hugging Face:** [0001AMA/SMOS](https://huggingface.co/spaces/0001AMA/SMOS)
- **Author:** Deborah Akuoko Minka / Deborah Akuoko-Minka
- [Research site](https://deborahakuokominka.wordpress.com/) · [GitLab](https://gitlab.com/2000pd3rvr) · [ORCID](https://orcid.org/0009-0008-6219-154X) · [Streamlit apps](https://streamlit-apps-hub.streamlit.app/)
"""

if not HTML.is_file():
    st.error("SMOS UI files are missing from this deployment.")
    st.markdown(ABOUT)
else:
    render_live_site(
        HTML,
        height=1100,
        about_title="About SMOS",
        about_md=ABOUT,
        site_root=ROOT,
        asset_cdn="https://cdn.jsdelivr.net/gh/2000pd3rvr/SMOS@main",
    )
