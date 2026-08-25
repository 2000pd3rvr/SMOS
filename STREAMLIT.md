# Deploying SMOS on Streamlit Community Cloud (GitLab → GitHub)

**Source of truth:** GitLab [2000pd3rvr/SMOS](https://gitlab.com/2000pd3rvr/SMOS)  
Streamlit Community Cloud pulls from the **GitHub mirror** ([2000pd3rvr/SMOS](https://github.com/2000pd3rvr/SMOS)) because Streamlit does not deploy directly from GitLab.

## Workflow

1. Push changes to GitLab `main` first.
2. Run this script (or sync the mirror) so GitHub matches GitLab.
3. Streamlit redeploys automatically from GitHub.

## Streamlit app settings

- **Repository:** `2000pd3rvr/SMOS`
- **Branch:** `main`
- **Main file:** `streamlit_app.py`
- **URL:** https://smos.streamlit.app/

## Links

- Live app: https://smos.streamlit.app/
- GitLab source: https://gitlab.com/2000pd3rvr/SMOS
- GitHub mirror: https://github.com/2000pd3rvr/SMOS
- Apps hub: https://streamlit-apps-hub.streamlit.app/
- Hugging Face: https://huggingface.co/spaces/0001AMA/SMOS
