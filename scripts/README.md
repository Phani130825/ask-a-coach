fill_parsed_resume.py

This helper extracts text from a local PDF or DOCX resume and POSTs it to the backend endpoint /api/resumes/:id/parse-local.

Usage (PowerShell):

# install dependencies into a venv
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r scripts\requirements.txt

# run the script
python .\scripts\fill_parsed_resume.py --file "C:\Path\to\resume.pdf" --resume-id <RESUME_ID> --server http://localhost:5000 --token <JWT>

Notes:
- The script expects the server to be running and the resume ID to belong to the authenticated user represented by the token.
- If parsing fails server-side during upload, use this script to provide a parsedText payload so the resume can be marked parsed and used for analysis.
