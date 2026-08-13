#!/usr/bin/env python3
"""Streamlit Community Cloud entrypoint — crawlable project page for SMOS.

Live interactive runtime: Hugging Face Space (0001AMA/SMOS)
Source: https://github.com/2000pd3rvr/SMOS
Author: Deborah Akuoko Minka / Deborah Akuoko-Minka
"""

from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="SMOS · Deborah Akuoko Minka",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

HF_SPACE = "0001AMA/SMOS"
HF_URL = f"https://huggingface.co/spaces/{HF_SPACE}"
HF_EMBED = f"https://{HF_SPACE.replace('/', '-')}.hf.space"
GH_URL = "https://github.com/2000pd3rvr/SMOS"
WP_URL = "https://deborahakuokominka.wordpress.com/"
ORCID = "https://orcid.org/0009-0008-6219-154X"
SCHOLAR = "https://scholar.google.co.uk/citations?hl=en&user=ab0EyjYAAAAJ"

st.title("SMOS")
st.subheader("Multilingual AI voice ordering and kitchen workflow")
st.caption(
    "Deborah Akuoko Minka is the same person as Deborah Akuoko-Minka "
    "(any capitalization; hyphen optional). Primary profiles: WordPress · ORCID · GitHub · Scholar."
)

c1, c2, c3, c4 = st.columns(4)
c1.link_button("Open live HF Space", HF_URL, use_container_width=True)
c2.link_button("GitHub source", GH_URL, use_container_width=True)
c3.link_button("WordPress research site", WP_URL, use_container_width=True)
c4.link_button("ORCID", ORCID, use_container_width=True)

st.markdown("---")
left, right = st.columns([1.2, 1])
with left:
    st.header("About")
    st.write("""SMOS (Smart Multilingual Ordering System) supports multilingual customer ordering and live kitchen workflow messaging. Interactive service runs on Hugging Face; this Streamlit page is the crawlable product description connected to GitHub. Built by Deborah Akuoko Minka / Deborah Akuoko-Minka.""")
    st.header("Features")
    for f in ['Multi-language ordering UX', 'Kitchen-side workflow views', 'Translation helpers for mixed-language service', 'Public Space demo with GitHub source']:
        st.markdown(f"- {f}")
    st.header("Audience")
    st.write("""Restaurant operators, hospitality tech evaluators, multilingual UX researchers.""")
    st.header("Technical notes")
    st.markdown(
        f"""
- **Backend / runtime:** FastAPI + static frontend (HF Space)
- **GitHub repository:** [{GH_URL}]({GH_URL})
- **Hugging Face Space:** [{HF_URL}]({HF_URL})
- **Streamlit role:** GitHub-connected description + discovery page for [Streamlit Community Cloud](https://share.streamlit.io/)
- **Keywords:** SMOS, multilingual ordering, restaurant kitchen, voice ordering, AI translation, Deborah Akuoko Minka
"""
    )
with right:
    st.header("Live demo")
    st.caption("Embedded Hugging Face Space (may take a few seconds to wake).")
    components.iframe(HF_EMBED, height=720, scrolling=True)
    st.markdown(f"If the embed is blank, open the full Space: [{HF_URL}]({HF_URL})")

st.markdown("---")
st.header("Author & equivalent name spellings")
st.markdown(
    """
**Deborah Akuoko Minka** = **Deborah Akuoko-Minka** = deborah akuoko minka (any caps).

Authoritative links for every spelling:
- WordPress: https://deborahakuokominka.wordpress.com/
- ORCID: https://orcid.org/0009-0008-6219-154X
- GitHub: https://github.com/2000pd3rvr
- Google Scholar: https://scholar.google.co.uk/citations?hl=en&user=ab0EyjYAAAAJ
- This app source: https://github.com/2000pd3rvr/SMOS
- Live Space: https://huggingface.co/spaces/0001AMA/SMOS
"""
)

# Hidden machine-readable block for crawlers / copy-paste
st.markdown(
    f"""
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SMOS",
  "description": "Multilingual AI voice ordering and kitchen workflow",
  "applicationCategory": "WebApplication",
  "url": "{HF_URL}",
  "codeRepository": "{GH_URL}",
  "author": {
    "@type": "Person",
    "name": "Deborah Akuoko Minka",
    "alternateName": ["Deborah Akuoko-Minka", "Deborah Akuoko", "Ama Akuoko"],
    "url": "{WP_URL}",
    "sameAs": ["{ORCID}", "{SCHOLAR}", "https://github.com/2000pd3rvr", "https://huggingface.co/0001AMA"]
  },
  "keywords": "SMOS, multilingual ordering, restaurant kitchen, voice ordering, AI translation, Deborah Akuoko Minka"
}
```
"""
)
