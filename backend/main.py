import asyncio
import logging
import os
from typing import List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum

from app.schemas import GenerateResponse, FunctionDoc
from app.docgen import (
    extract_functions_and_classes,
    get_source_for_fn,
    insert_docstrings_into_source
)
from app.openai_client import generate_docstring
from app.utils import FunctionInfo, extract_code_from_file

logger = logging.getLogger("doc_generator")
logger.setLevel(logging.INFO)


# APP set up
app = FastAPI(
    title="AI Docstring Generator",
    description="""
Generate docstrings for code automatically using AI.

Features:
- Upload a file or paste code
- Supports Google, NumPy, and PEP-257 formats
- Returns modified source + extracted docs
""",
    version="1.0.0",
    contact={
        "name": "Smruti",
        "email": "smrutid12@gmail.com",
    },
    docs_url="/swagger",
    redoc_url="/docs-redoc",
    openapi_url="/openapi"
)

ENV = os.getenv('ENV', 'dev')

if ENV == 'production':
    frontend_url = os.getenv('FRONTEND_URL')
    origins = [frontend_url]
else:
    origins = ['http://localhost:4000', '*']  # dev mode

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API
class FormatOptions(str, Enum):
    google = "Google"
    numpy = "NumPy"
    pep257 = "PEP-257"

class LanguageOptions(str, Enum):
    python = "Python"
    javascript = "Javascript"
    typescript = "Typescript"
    java = "Java"
    c = "C"
    cpp = "C++"

@app.post("/generate", response_model=GenerateResponse)
async def generate_docs(
    code: str = Form(None),
    language: LanguageOptions = Form("Python"),
    format: FormatOptions = Form(...),
    file: UploadFile = File(None)
):
    logger.info("REQUEST RECEIVED → /generate")
    logger.info(f"Language: {language}, Format: {format}, File uploaded: {bool(file)}")

    # Validate input
    if not code and not file:
        logger.warning("No code or file provided by user")
        raise HTTPException(status_code=400, detail="Please provide valid code or upload a file")

    # Read file if provided
    if file:
        logger.info(f"Reading file: {file.filename}")
        try:
            code = await extract_code_from_file(file)
            logger.info(f"File successfully read: {file.filename} ({len(code)} chars)")
        except Exception as e:
            logger.error(f"File read error: {e}")
            raise HTTPException(status_code=400, detail="Unable to read the uploaded file.")

    source = code

    # Extract functions/classes
    try:
        logger.info("Extracting functions/classes from source code")
        infos : List[FunctionInfo] = extract_functions_and_classes(language, source)
        logger.info(f"Extraction complete → Found {len(infos)} items")
    except SyntaxError as e:
        logger.error(f"Syntax error in source: {e}")
        raise HTTPException(status_code=400, detail=f"Syntax error in source: {e}")

    updates = []
    docs_resp = []

    sem = asyncio.Semaphore(2)
    logger.info("Starting docstring generation process")

    async def process(info : FunctionInfo):
        nonlocal source
        fn_src = get_source_for_fn(language, source, info)

        logger.info(f"Generating docstring for function: {info.name}")

        async with sem:
            try:
                parsed = await generate_docstring(
                    function_language=language,
                    function_name=info.name,
                    function_code=fn_src,
                    function_format=format
                )
            except Exception as e:
                logger.error(f"Docstring generation failed for {info.name}: {e}")
                raise

        doctext = parsed.get("docstring")
        info.generated_docstring = doctext

        docs_resp.append(FunctionDoc(
            name=info.name,
            start_lineno=info.start,
            end_lineno=info.end,
            existing_docstring=info.existing_docstring,
            generated_docstring=doctext
        ))
        updates.append((info.start, info.end, doctext or ""))

        logger.info(f"Docstring generated for {info.name} → {len(doctext or '')} chars")

    # Sequential execution for safety
    for info in infos:
        await process(info)

    logger.info("Injecting docstrings into source code")
    modified = insert_docstrings_into_source(source, updates)
    logger.info("Docstring insertion complete")

    logger.info("Returning final response to client")
    return GenerateResponse(modified_code=modified, docs=docs_resp)
