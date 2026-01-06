# logic: extract funcs/classes, insert docstrings
import ast
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
    elif language.lower() in ["c++", "cpp", "c"]:
        return extract_cpp_functions(source)
    elif language.lower() in ["c"]:
        return extract_c_functions(source)
    else:
        raise ValueError(f"Unsupported language: {language}")

def get_source_for_fn(language: str, source: str, info: FunctionInfo) -> str:
    """
    Return raw source text for the node (function/class) for eaqch language.
    """
    language = language.lower()

    # ---------------- PYTHON ----------------
    if language == "python":
        return ast.get_source_segment(source, info.node) or ""

    # ---------------- JS / TS ----------------
    if language in ("javascript", "typescript"):
        if info.start and info.end:
            lines = source.splitlines()
            return "\n".join(lines[info.start - 1 : info.end])
        return ""

    # ---------------- JAVA ----------------
    if language == "java":
        if info.start:
            # Java has no `end`, so return only method signature line
            return source.splitlines()[info.start - 1]
        return ""

    # ---------------- C++ ----------------
    if language in ("c++", "cpp", "c"):
        if info.start:
            return source.splitlines()[info.start - 1]
        return ""

    return ""



def insert_docstrings_into_source(original_source: str, updates: List[Tuple[int, int, str]]) -> str:
    """
    updates: list of (start_lineno, end_lineno, generated_docstring_text)
    We'll reconstruct file by inserting docstrings in the right place.
    Each docstring text should already be a triple-quoted string without extra indentation; we'll indent as needed.
    """
    lines = original_source.splitlines()
    # process updates in reverse order so line numbers remain valid
    for start, end, doctext in sorted(updates, key=lambda x: x[0], reverse=True):
        # find the first statement line after the def/class line that should contain docstring position
        insert_line_idx = start  # 1-based lineno -> 0-based index
        # compute indentation from the def line
        def_line = lines[start - 1]
        indent = def_line[:len(def_line) - len(def_line.lstrip())] + "    "  # 4-space indent inside block
        # build docstring lines
        doc_lines = ['{}"""{}"""'.format(indent, doctext.strip().replace('"""','\\"\"\"'))]
        # If there is already a docstring, replace it: find the node body first statement if it's a string
        # For simplicity, we'll check line at start (next line) for triple quotes
        next_idx = start  # 0-based index where first line of body likely starts
        if next_idx < len(lines) and lines[next_idx].lstrip().startswith('"""'):
            # replace existing docstring block; find its end
            j = next_idx
            while j < len(lines):
                if lines[j].rstrip().endswith('"""') and j != next_idx:
                    break
                j += 1
            # replace lines[next_idx:j+1] with doc_lines
            lines[next_idx:j+1] = doc_lines
        else:
            # Insert doclines after def/class line
            lines[insert_line_idx:insert_line_idx] = doc_lines
    return "\n".join(lines)
