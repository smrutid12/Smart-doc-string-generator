# logic: extract funcs/classes, insert docstrings
import ast
import re
import textwrap
from typing import List, Tuple
from app.utils import FunctionInfo, extract_c_functions, extract_cpp_functions, extract_java_functions, extract_js_functions, extract_python_functions, extract_ts_functions


def extract_functions_and_classes(language:str, source: str) -> List[FunctionInfo]:
    """
    Parse source and return list of functions and classes with lineno ranges and existing docstrings.
    """

    if language.lower() == "python":
        return extract_python_functions(source)
    elif language.lower() == "javascript":
        return extract_js_functions(source)
    elif language.lower() == "typescript":
        return extract_ts_functions(source)
    elif language.lower() == "java":
        return extract_java_functions(source)
    elif language.lower() in ["c++", "cpp"]:
        return extract_cpp_functions(source)
    elif language.lower() == "c":
        return extract_c_functions(source)
    else:
        raise ValueError(f"Unsupported language: {language}")


def get_source_for_fn(language: str, source: str, info: FunctionInfo) -> str:
    language = language.lower()
    lines = source.splitlines()

    if language == "python":
        return ast.get_source_segment(source, info.node) or ""

    if language in ("javascript", "typescript"):
        if info.start and info.end:
            return "\n".join(lines[info.start - 1 : info.end])
        return ""

    if language == "java":
        if info.start:
            return lines[info.start - 1]
        return ""

    if language in ("c++", "cpp", "c"):
        if info.start and info.end:
            return "\n".join(lines[info.start - 1 : info.end])
        elif info.start:
            return lines[info.start - 1]
        return ""

    return ""


def insert_docstrings_into_source(
    original_source: str,
    updates: List[Tuple[int, int, str]],
    language: str = "Python",
) -> str:
    """
    Insert generated documentation into source code.

    Python:
    - Inserts docstring inside function/class body.

    JavaScript / TypeScript / Java / C / C++:
    - Inserts block comment above function/method.
    """

    lines = original_source.splitlines()
    language = language.lower()

    block_comment_languages = {
        "javascript",
        "typescript",
        "java",
        "c",
        "c++",
        "cpp",
    }

    for start, end, doctext in sorted(updates, key=lambda x: x[0], reverse=True):
        if not doctext:
            continue

        def_line = lines[start - 1]
        base_indent = def_line[: len(def_line) - len(def_line.lstrip())]

        # JS / TS / Java / C / C++
        if language in block_comment_languages:
            doc_lines = [
                base_indent + line.strip() if line.strip() else ""
                for line in doctext.strip().splitlines()
            ]

            # Insert above function line
            lines[start - 1 : start - 1] = doc_lines

        # Python
        else:
            indent = base_indent + "    "
            clean_doc = doctext.strip().replace('"""', '\\"""')

            if clean_doc.startswith('"""') and clean_doc.endswith('"""'):
                doc_lines = [
                    indent + line.strip() if line.strip() else ""
                    for line in clean_doc.splitlines()
                ]
            else:
                doc_lines = [f'{indent}"""{clean_doc}"""']

            next_idx = start

            if next_idx < len(lines) and lines[next_idx].lstrip().startswith('"""'):
                j = next_idx
                while j < len(lines):
                    if lines[j].rstrip().endswith('"""') and j != next_idx:
                        break
                    j += 1

                lines[next_idx : j + 1] = doc_lines
            else:
                lines[start:start] = doc_lines

    return "\n".join(lines)


def normalize_python_source(source: str) -> str:
    try:
        ast.parse(source)
        return source
    except SyntaxError:
        source = re.sub(r':\s+', ':\n    ', source)
        source = textwrap.dedent(source)
        ast.parse(source)  # re-validate
        return source