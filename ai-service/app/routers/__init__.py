"""
routers — FastAPI Route Handlers

One router per pipeline endpoint:
  ocr.py            POST /ocr/extract
  classification.py POST /classify
  extraction.py     POST /extract
  process.py        POST /process  (full pipeline)

Implemented alongside each pipeline stage sprint.
"""
