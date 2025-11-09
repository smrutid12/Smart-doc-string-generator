# logic: extract funcs/classes, insert docstrings
import ast
from typing import List, Tuple, Optional
import astor  # optional helper to convert node back to source (pip install astor)

class FunctionInfo:
    def __init__(self, name, start, end, node, existing_docstring):
        self.name = name
        self.start = start
        self.end = end
        self.node = node
        self.existing_docstring = existing_docstring
        self.generated_docstring = None

def extract_functions_and_classes(source: str) -> List[FunctionInfo]:
    """
    Parse source and return list of functions and classes with lineno ranges and existing docstrings.
    """
    tree = ast.parse(source)
    res: List[FunctionInfo] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            # ast nodes have lineno (start) and end_lineno (Py3.8+ provides end_lineno)
            start = getattr(node, "lineno", None)
            end = getattr(node, "end_lineno", None)
            name = node.name
            existing_doc = ast.get_docstring(node)
            res.append(FunctionInfo(name, start, end, node, existing_doc))
    # sort by start line (ascending)
    res.sort(key=lambda x: (x.start if x.start else 0))
    return res

def get_node_source_segment(source: str, node: ast.AST) -> str:
    """
    Return raw source text for the node (function/class). Requires Python 3.8+ end_lineno.
    """
    lines = source.splitlines()
    start = node.lineno - 1
    end = node.end_lineno
    return "\n".join(lines[start:end])

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
