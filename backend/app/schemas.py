# pydantic request/response models
from pydantic import BaseModel
from typing import Optional, List, Dict

class GenerateRequest(BaseModel):
    code: str
    language: Optional[str] = "python"   # support fallback if later extend

class FunctionDoc(BaseModel):
    name: str
    start_lineno: int
    end_lineno: int
    existing_docstring: Optional[str]
    generated_docstring: Optional[str]

class GenerateResponse(BaseModel):
    modified_code: str
    docs: List[FunctionDoc]
