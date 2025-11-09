# FastAPI app + endpoints
from fastapi import FastAPI, HTTPException
from app.schemas import GenerateRequest, GenerateResponse, FunctionDoc
from app.docgen import extract_functions_and_classes, get_node_source_segment, insert_docstrings_into_source
from app.openai_client import generate_docstring
import asyncio

app = FastAPI(title="AI Docstring Generator")

@app.post("/generate", response_model=GenerateResponse)
async def generate_docs(req: GenerateRequest):
    if req.language.lower() != "python":
        raise HTTPException(status_code=400, detail="Currently only python is supported")

    source = req.code
    try:
        infos = extract_functions_and_classes(source)
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Syntax error in source: {e}")

    updates = []
    docs_resp = []
    # iterate sequentially or concurrently with a bounded semaphore to avoid hitting rate limits
    sem = asyncio.Semaphore(2)  # limit concurrency
    async def process(info):
        nonlocal source
        fn_src = get_node_source_segment(source, info.node)
        payload = await asyncio.get_event_loop().run_in_executor(None, lambda: None)  # placeholder if needed
        async with sem:
            parsed = await generate_docstring(info.name, fn_src)
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

    # sequential for safety
    for info in infos:
        await process(info)

    modified = insert_docstrings_into_source(source, updates)

    return GenerateResponse(modified_code=modified, docs=docs_resp)
