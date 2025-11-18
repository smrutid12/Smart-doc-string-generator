# helper functions (chunking, safety, function extraction)
import ast
from typing import List, Optional
from fastapi import UploadFile

# JS/TS
import esprima
# from py_sucrase import transform

# Java
import javalang

# C/C++
from clang.cindex import Index

# -------------------------------
# Async file reading
# -------------------------------
async def extract_code_from_file(file: UploadFile) -> str:
    content = await file.read()
    return content.decode("utf-8", errors="ignore")


# -------------------------------
# Function Info Container
# -------------------------------
class FunctionInfo:
    def __init__(
        self,
        name: str,
        start: Optional[int],
        end: Optional[int],
        node=None,
        existing_docstring: Optional[str] = None,
    ):
        self.name = name
        self.start = start
        self.end = end
        self.node = node
        self.existing_docstring = existing_docstring
        self.generated_docstring: Optional[str] = None


# -------------------------------
# Python extractor (native)
# -------------------------------
def extract_python_functions(source: str) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            start = getattr(node, 'lineno', None)
            end = getattr(node, 'end_lineno', None)
            name = node.name
            existing_doc = ast.get_docstring(node)
            res.append(FunctionInfo(name, start, end, node, existing_doc))
    res.sort(key=lambda x: (x.start if x.start else 0))
    return res


# -------------------------------
# JavaScript / TypeScript extractor
# -------------------------------
def extract_js_functions(source: str) -> List[FunctionInfo]:
    return _extract_es_functions(source)


def extract_ts_functions(source: str) -> List[FunctionInfo]:
    # # Convert TypeScript to JS using Sucrase
    js_code = ''
    # js_code = transform(source, transforms=["typescript"])["code"]
    return _extract_es_functions(source)


def _extract_es_functions(source: str) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []
    try:
        tree = esprima.parseScript(source, loc=True)
    except Exception:
        return res

    for node in tree.body:
        if node.type in ("FunctionDeclaration", "ClassDeclaration"):
            name = getattr(node.id, "name", "<anonymous>") if node.type == "FunctionDeclaration" else getattr(node.id, "name", "<anonymous>")
            start = node.loc.start.line
            end = node.loc.end.line
            res.append(FunctionInfo(name, start, end, node, None))
    return res


# -------------------------------
# Java extractor
# -------------------------------
def extract_java_functions(source: str) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []
    try:
        tree = javalang.parse.parse(source)
    except Exception:
        return res

    for _, method in tree.filter(javalang.tree.MethodDeclaration):
        start = method.position.line if method.position else None
        res.append(FunctionInfo(method.name, start, None, method, None))
    return res


# -------------------------------
# C++ extractor
# -------------------------------
def extract_cpp_functions(source: str) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []
    try:
        index = Index.create()
        tu = index.parse("temp.cpp", unsaved_files=[("temp.cpp", source)])
    except Exception:
        return res

    for node in tu.cursor.get_children():
        if node.kind.name == "FUNCTION_DECL":
            start = node.location.line
            res.append(FunctionInfo(node.spelling, start, None, node, None))
    return res


# -------------------------------
# Unified function
# -------------------------------
def extract_functions_and_classes(language: str, source: str) -> List[FunctionInfo]:
    language = language.lower()
    if language == "python":
        return extract_python_functions(source)
    elif language == "javascript":
        return extract_js_functions(source)
    elif language == "typescript":
        return extract_ts_functions(source)
    elif language == "java":
        return extract_java_functions(source)
    elif language in ("c++", "cpp"):
        return extract_cpp_functions(source)
    else:
        raise ValueError(f"Unsupported language: {language}")


def indent_docstring(docstring: str, indent: str) -> str:
    """Indent all lines of the docstring according to the function indentation."""
    lines = docstring.split("\n")
    if not lines:
        return docstring
    
    # First line stays right after the triple quotes
    formatted = [lines[0]]
    
    # Remaining lines get indentation
    for line in lines[1:]:
        formatted.append(indent + line)
    return "\n".join(formatted)
