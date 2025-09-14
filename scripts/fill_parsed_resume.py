"""Helper script to extract text from a local resume file (PDF or DOCX) and POST it to the server
Endpoint: POST /api/resumes/:id/parse-local
It expects an auth token (JWT) to be passed via --token or environment variable API_TOKEN.

Usage examples (PowerShell):
python .\scripts\fill_parsed_resume.py --file path\to\resume.pdf --resume-id <RESUME_ID> --server http://localhost:5000 --token <JWT>

This script uses pdfminer.six for PDFs and python-docx for DOCX files.
"""
import argparse
import os
import sys
import requests

try:
    from pdfminer.high_level import extract_text as extract_pdf_text
except Exception:
    extract_pdf_text = None

try:
    import docx
except Exception:
    docx = None


def extract_text_from_docx(path):
    if docx is None:
        raise RuntimeError('python-docx is not installed')
    doc = docx.Document(path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)


def extract_text_from_pdf(path):
    if extract_pdf_text is None:
        raise RuntimeError('pdfminer.six is not installed')
    return extract_pdf_text(path)


def post_parsed_text(server, resume_id, token, text):
    url = server.rstrip('/') + f'/api/resumes/{resume_id}/parse-local'
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    resp = requests.post(url, json={'parsedText': text}, headers=headers)
    return resp


def trigger_analysis(server, resume_id, token, job_description):
    url = server.rstrip('/') + f'/api/resumes/{resume_id}/analyze'
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    payload = {'jobDescription': job_description}
    resp = requests.post(url, json=payload, headers=headers)
    return resp


def main():
    parser = argparse.ArgumentParser(description='Send locally parsed resume text to server and optionally trigger analysis')
    parser.add_argument('--file', required=True, help='Path to PDF or DOCX resume')
    parser.add_argument('--resume-id', required=True, help='Resume document id from server')
    parser.add_argument('--server', default=os.environ.get('SERVER_URL', 'http://localhost:5000'), help='Server base URL')
    parser.add_argument('--token', default=os.environ.get('API_TOKEN'), help='Bearer token (JWT) for authentication')
    parser.add_argument('--analyze', action='store_true', help='Trigger /api/resumes/:id/analyze after saving parsed text')
    parser.add_argument('--job-description', default='', help='Job description text to use when triggering analysis')
    args = parser.parse_args()

    path = args.file
    if not os.path.exists(path):
        print('File not found:', path)
        sys.exit(1)

    ext = os.path.splitext(path)[1].lower()
    text = ''
    try:
        if ext == '.pdf':
            text = extract_text_from_pdf(path)
        elif ext in ('.docx', '.doc'):
            text = extract_text_from_docx(path)
        else:
            print('Unsupported file type. Use PDF or DOCX.')
            sys.exit(1)
    except Exception as e:
        print('Failed to extract text:', e)
        sys.exit(1)

    print('Posting parsed text to server...')
    resp = post_parsed_text(args.server, args.resume_id, args.token, text)
    try:
        print('Parse-local response:', resp.status_code, resp.text)
    except Exception:
        print('Parse-local response status:', resp.status_code)

    if args.analyze:
        if not args.job_description:
            print('Analysis requested but no --job-description provided. Skipping analysis.')
            return

        print('Triggering analysis...')
        resp2 = trigger_analysis(args.server, args.resume_id, args.token, args.job_description)
        try:
            print('Analyze response:', resp2.status_code, resp2.text)
        except Exception:
            print('Analyze response status:', resp2.status_code)


if __name__ == '__main__':
    main()
