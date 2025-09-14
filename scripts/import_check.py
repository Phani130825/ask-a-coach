import sys

try:
    from pdfminer.high_level import extract_text
    import docx
    import requests
    print('IMPORTS_OK')
except Exception as e:
    print('IMPORT_ERROR:', e)
    sys.exit(2)
