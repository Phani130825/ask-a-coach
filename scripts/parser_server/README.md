Parser server

This small Flask app accepts a multipart file upload (field name `resume`) and returns extracted text and a short summary.

Run locally (PowerShell):

python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r scripts\parser_server\requirements.txt
python scripts\parser_server\app.py

Endpoints:
- GET /health
- POST /parse-file (multipart/form-data, field `resume`) -> JSON { success, parsedText, summary }

Use case:
- Your frontend or helper script can POST the uploaded file to this parser service to get parsed text.
- The `scripts/fill_parsed_resume.py` can be switched to call this service instead of doing local parsing.
