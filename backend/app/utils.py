# helper functions (chunking, safety, function extraction)
import ast
import re
import textwrap
from typing import List, Optional
from fastapi import UploadFile

# JS/TS
import esprima
# from py_sucrase import transform

# Java
import javalang

# C/C++
from clang.cindex import Index

import logging

logger = logging.getLogger("utils")
logger.setLevel(logging.INFO)
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

    # 🔴 Normalize BEFORE ast.parse
    source = normalize_python_source(source)

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
    return _extract_es_functions(source, is_typescript=False)


def extract_ts_functions(source: str) -> List[FunctionInfo]:
    return _extract_es_functions(source, is_typescript=True)


def strip_typescript_types(source: str) -> str:
    # Remove type aliases:
    # type User = { id: number; name: string };
    source = re.sub(
        r"\btype\s+\w+\s*=\s*\{[\s\S]*?\};?",
        "",
        source,
        flags=re.MULTILINE,
    )

    # Remove interfaces:
    # interface User { id: number; name: string }
    source = re.sub(
        r"\binterface\s+\w+\s*\{[\s\S]*?\}",
        "",
        source,
        flags=re.MULTILINE,
    )

    # Remove parameter/property types: name: string, age: number
    source = re.sub(
        r":\s*[A-Za-z_$][\w$<>\[\]\|&,\s]*?(?=[,\)=;])",
        "",
        source,
    )

    # Remove return types: ): string {
    source = re.sub(
        r"\)\s*:\s*[A-Za-z_$][\w$<>\[\]\|&,\s]*?\s*\{",
        ") {",
        source,
    )

    return source


def _extract_es_functions(source: str, is_typescript: bool = False) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []

    parse_source = strip_typescript_types(source) if is_typescript else source

    try:
        tree = esprima.parseModule(parse_source, loc=True)
    except Exception as e:
        logger.error(f"ES parsing failed: {e}")
        return res

    for node in tree.body:
        if node.type in ("FunctionDeclaration", "ClassDeclaration"):
            name = getattr(node.id, "name", "<anonymous>")
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


from clang.cindex import Index, CursorKind


def find_c_like_block_end(source: str, start_line: int) -> int:
    """
    Find the ending line of a C/C++ function by counting braces.
    start_line is 1-based.
    """
    lines = source.splitlines()
    brace_count = 0
    found_opening_brace = False

    for i in range(start_line - 1, len(lines)):
        line = lines[i]

        # Remove simple single-line comments
        code_line = line.split("//")[0]

        for char in code_line:
            if char == "{":
                brace_count += 1
                found_opening_brace = True
            elif char == "}":
                brace_count -= 1

                if found_opening_brace and brace_count == 0:
                    return i + 1  # 1-based line number

    return start_line


def walk_clang_cursor(cursor):
    """
    Recursively walk clang AST nodes.
    Needed because C++ class methods are nested inside class declarations.
    """
    for child in cursor.get_children():
        yield child
        yield from walk_clang_cursor(child)


# -------------------------------
# C++ extractor
# -------------------------------
def extract_cpp_functions(source: str) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []

    try:
        index = Index.create()
        tu = index.parse(
            "temp.cpp",
            args=["-std=c++17"],
            unsaved_files=[("temp.cpp", source)],
        )
    except Exception as e:
        logger.error(f"C++ parsing failed: {e}")
        return res

    for node in walk_clang_cursor(tu.cursor):
        if node.kind in (
            CursorKind.FUNCTION_DECL,
            CursorKind.CXX_METHOD,
            CursorKind.CONSTRUCTOR,
            CursorKind.DESTRUCTOR,
            CursorKind.FUNCTION_TEMPLATE,
        ):
            if not node.location or not node.location.file:
                continue

            # Ignore functions coming from system headers
            if "temp.cpp" not in str(node.location.file):
                continue

            start = node.location.line
            end = find_c_like_block_end(source, start) if start else None

            name = node.spelling or node.displayname or "<anonymous>"

            res.append(FunctionInfo(
                name=name,
                start=start,
                end=end or start,
                node=node,
                existing_docstring=None,
            ))

    res.sort(key=lambda x: x.start or 0)
    return res


# -------------------------------
# C extractor
# -------------------------------
def extract_c_functions(source: str) -> List[FunctionInfo]:
    res: List[FunctionInfo] = []

    try:
        index = Index.create()
        tu = index.parse(
            "temp.c",
            args=["-std=c11"],
            unsaved_files=[("temp.c", source)],
        )
    except Exception as e:
        logger.error(f"C parsing failed: {e}")
        return res

    for node in walk_clang_cursor(tu.cursor):
        if node.kind == CursorKind.FUNCTION_DECL and node.is_definition():
            if not node.location or not node.location.file:
                continue

            # Ignore functions coming from system headers
            if "temp.c" not in str(node.location.file):
                continue

            start = node.location.line
            end = find_c_like_block_end(source, start) if start else None

            name = node.spelling or node.displayname or "<anonymous>"

            res.append(FunctionInfo(
                name=name,
                start=start,
                end=end or start,
                node=node,
                existing_docstring=None,
            ))

    res.sort(key=lambda x: x.start or 0)
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
    elif language in ("c"):
        return extract_c_functions(source)
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


def normalize_python_source(source: str) -> str:
    try:
        ast.parse(source)
        return source
    except SyntaxError:
        source = re.sub(r':\s+', ':\n    ', source)
        source = textwrap.dedent(source)
        ast.parse(source)  # re-validate
        return source