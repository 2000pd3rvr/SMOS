#!/usr/bin/env python3
"""SMOS — live demo on Streamlit Community Cloud."""

from __future__ import annotations

from pathlib import Path

import streamlit as st

from streamlit_static import render_live_site

HTML = Path(__file__).resolve().parent / "static" / "index.html"

st.set_page_config(
    page_title="SMOS · Deborah Akuoko Minka",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ABOUT = """
**SMOS** takes spoken or typed food orders across languages and passes them into a kitchen workflow.

- **Live on Streamlit:** this page
- **Source:** [github.com/2000pd3rvr/SMOS](https://github.com/2000pd3rvr/SMOS)
- **Also on Hugging Face:** [0001AMA/SMOS](https://huggingface.co/spaces/0001AMA/SMOS)
- **Author:** Deborah Akuoko Minka / Deborah Akuoko-Minka
- [Research site](https://deborahakuokominka.wordpress.com/) · [ORCID](https://orcid.org/0009-0008-6219-154X)
"""

render_live_site(HTML, height=960, about_title="About SMOS", about_md=ABOUT)
