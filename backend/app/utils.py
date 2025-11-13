# helper functions (e.g., chunking, safety)

import ast
from typing import List

class FunctionInfo:
    def __init__(self, name, start, end, node, existing_docstring):
        self.name = name
        self.start = start
        self.end = end
        self.node = node
        self.existing_docstring = existing_docstring
        self.generated_docstring = None


def extract_python_functions(source: str, res: List[FunctionInfo]):
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            # ast nodes have lineno (start) and end_lineno (Py3.8+ provides end_lineno)
            start = getattr(node, "lineno", None)
            end = getattr(node, "end_lineno", None)
            name = node.name
            existing_doc = ast.get_docstring(node)
            res.append(FunctionInfo(name, start, end, node, existing_doc))
    res.sort(key=lambda x: (x.start if x.start else 0)) # sort by start line (ascending)
    return res

def extract_js_functions(source: str):
    return

def extract_ts_functions(source: str):
    return

def extract_java_functions(source: str):
    return

def extract_c_plus_plus_functions(source: str):
    return