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


# -------------------------------
# C / C++ regex fallback extractor
# -------------------------------
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
                    return i + 1

    return start_line


def extract_c_like_functions_regex(source: str) -> List[FunctionInfo]:
    """
    Lightweight C/C++ function extractor.
    Works without libclang.

    Handles examples like:
    int addNumbers(int a, int b) {
    void greetUser(char name[]) {
    string formatName(string firstName, string lastName) {
    bool isUserActive(bool status) {
    """
    res: List[FunctionInfo] = []
    lines = source.splitlines()

    function_pattern = re.compile(
        r"""
        ^\s*
        (?!if\b|for\b|while\b|switch\b|catch\b|else\b)
        (?:template\s*<[^>]+>\s*)?
        (?:
            [A-Za-z_][\w:<>\*&\s]*      # return type
            \s+
        )?
        ([A-Za-z_]\w*)                  # function name
        \s*
        \([^;{}]*\)                     # parameters
        \s*
        (?:const\s*)?
        \{                              # function body starts
        """,
        re.VERBOSE,
    )

    for index, line in enumerate(lines):
        match = function_pattern.match(line)
        if not match:
            continue

        name = match.group(1)

        # Skip common control-like false positives
        if name in {"if", "for", "while", "switch", "catch"}:
            continue

        start = index + 1
        end = find_c_like_block_end(source, start)

        res.append(FunctionInfo(
            name=name,
            start=start,
            end=end,
            node=None,
            existing_docstring=None,
        ))

    res.sort(key=lambda x: x.start or 0)
    return res


# -------------------------------
# C++ extractor
# -------------------------------
def extract_cpp_functions(source: str) -> List[FunctionInfo]:
    return extract_c_like_functions_regex(source)


# -------------------------------
# C extractor
# -------------------------------
def extract_c_functions(source: str) -> List[FunctionInfo]:
    return extract_c_like_functions_regex(source)


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