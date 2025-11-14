import asyncio
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Form

from app.schemas import GenerateResponse, FunctionDoc
from app.docgen import (
    extract_functions_and_classes,
    get_node_source_segment,
    insert_docstrings_into_source
)
from app.openai_client import generate_docstring
from app.utils import extract_code_from_file

logger = logging.getLogger("doc_generator")
logger.setLevel(logging.INFO)

app = FastAPI(title="AI Docstring Generator")


@app.post("/generate", response_model=GenerateResponse)
async def generate_docs(
    code: str = Form(""),
    language: str = Form("Python"),
    format: str = Form(...),
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
        infos = extract_functions_and_classes(language, source)
        logger.info(f"Extraction complete → Found {len(infos)} items")
    except SyntaxError as e:
        logger.error(f"Syntax error in source: {e}")
        raise HTTPException(status_code=400, detail=f"Syntax error in source: {e}")

    updates = []
    docs_resp = []

    sem = asyncio.Semaphore(2)
    logger.info("Starting docstring generation process")

    async def process(info):
        nonlocal source
        fn_src = get_node_source_segment(source, info.node)

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
