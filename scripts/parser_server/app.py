from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os

try:
    from pdfminer.high_level import extract_text as extract_pdf_text
except Exception:
    extract_pdf_text = None

try:
    import docx
except Exception:
    docx = None

app = Flask(__name__)
CORS(app)


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


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'parser-server'})


@app.route('/parse-file', methods=['POST'])
def parse_file():
    # Expect a multipart/form-data with field 'resume'
    if 'resume' not in request.files:
        return jsonify({'success': False, 'error': "No file part 'resume' found"}), 400

    file = request.files['resume']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()

    # Save to temp file for parsing
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        file.save(tmp.name)
        tmp.close()

        if ext == '.pdf':
            text = extract_text_from_pdf(tmp.name)
        elif ext in ('.docx', '.doc'):
            text = extract_text_from_docx(tmp.name)
        else:
            # try to read as text/plain
            try:
                with open(tmp.name, 'r', encoding='utf-8') as f:
                    text = f.read()
            except Exception:
                return jsonify({'success': False, 'error': 'Unsupported file type'}), 400

        safe_text = (text or '').strip()
        summary = safe_text[:200] + ('...' if len(safe_text) > 200 else '')

        return jsonify({'success': True, 'parsedText': safe_text, 'summary': summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


if __name__ == '__main__':
    # Allow overriding host/port via env vars when running
    host = os.environ.get('PARSER_HOST', '127.0.0.1')
    port = int(os.environ.get('PARSER_PORT', 6000))
    app.run(host=host, port=port)
