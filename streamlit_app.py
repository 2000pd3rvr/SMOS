#!/usr/bin/env python3
"""SMOS — Streamlit Community Cloud app (GitHub-connected)."""

from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="SMOS · Deborah Akuoko Minka",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="expanded",
)

HF_URL = "https://huggingface.co/spaces/0001AMA/SMOS"
HF_EMBED = "https://0001AMA-SMOS.hf.space"
GH_URL = "https://github.com/2000pd3rvr/SMOS"
WP_URL = "https://deborahakuokominka.wordpress.com/"
ORCID = "https://orcid.org/0009-0008-6219-154X"
SCHOLAR = "https://scholar.google.co.uk/citations?hl=en&user=ab0EyjYAAAAJ"

st.title("SMOS")
st.subheader("Multilingual ordering with a live kitchen workflow")
st.caption("Deborah Akuoko Minka · Deborah Akuoko-Minka")

b1, b2, b3, b4 = st.columns(4)
b1.link_button("Live demo", HF_URL, use_container_width=True)
b2.link_button("Source on GitHub", GH_URL, use_container_width=True)
b3.link_button("Research site", WP_URL, use_container_width=True)
b4.link_button("ORCID", ORCID, use_container_width=True)

st.markdown("---")
left, right = st.columns([1.25, 1])

with left:
    st.header("What it is")
    st.write(
        "SMOS (Smart Multilingual Ordering System) helps restaurants take orders across "
        "languages and pass them into a kitchen-facing workflow. The demo shows how a "
        "front-of-house view and a kitchen view can stay in step when guests and staff "
        "do not share a single language."
    )

    st.header("What you can do")
    st.markdown(
        """
- Place sample orders in more than one language
- Follow how those orders appear on the kitchen side
- Explore translation helpers for mixed-language service
- Review the implementation on GitHub
        """
    )

    st.header("Who it is for")
    st.write(
        "Restaurant operators, hospitality teams, and people evaluating multilingual "
        "ordering interfaces."
    )

    st.header("How it is built")
    st.markdown(
        f"""
- **Live app:** [Hugging Face Space — 0001AMA/SMOS]({HF_URL})
- **Source:** [{GH_URL}]({GH_URL})
- **Stack:** FastAPI with a static front end
- **Author:** Deborah Akuoko Minka (also written Deborah Akuoko-Minka)
        """
    )

    st.header("Related links")
    st.markdown(
        f"""
- [WordPress research site]({WP_URL})
- [ORCID]({ORCID})
- [Google Scholar]({SCHOLAR})
        """
    )

with right:
    st.header("Preview")
    st.write("Embedded view of the live Space. If the frame is empty, open the live demo link above.")
    components.iframe(HF_EMBED, height=720, scrolling=True)

st.markdown("---")
st.caption(
    "Deborah Akuoko Minka · hospitality interfaces · "
    f"[deborahakuokominka.wordpress.com]({WP_URL})"
)
