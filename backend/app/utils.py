# helper functions (e.g., chunking, safety)

import ast
from typing import List
from fastapi import UploadFile
from tree_sitter import Parser
from tree_sitter_languages import get_language


async def extract_code_from_file(file: UploadFile) -> str:
    """
    Reads an uploaded file asynchronously and returns the text content.
    """
    content = await file.read()
    return content.decode("utf-8", errors="ignore")

class FunctionInfo:
    def __init__(self, name, start, end, node, existing_docstring):
        self.name = name
        self.start = start
        self.end = end
        self.node = node
        self.existing_docstring = existing_docstring
        self.generated_docstring = None



# --- Python extractor (native) ---
def extract_python_functions(source: str, res: List[FunctionInfo]):
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


# --- Universal Tree-sitter-based extractors ---
def _extract_tree_sitter_functions(source: str, language_name: str) -> List[FunctionInfo]:
    """
    Generic extractor using tree-sitter for JS, TS, Java, and C++.
    """
    language = get_language(language_name)

    parser = Parser()
    parser.language = language

    tree = parser.parse(bytes(source, 'utf8'))
    root = tree.root_node
    res: List[FunctionInfo] = []

    def walk(node):
        if node.type in (
            'function_declaration', 'method_definition', 'class_declaration',
            'function_definition', 'constructor_declaration'
        ):
            name_node = None
            for child in node.children:
                if child.type in ('identifier', 'name'):
                    name_node = child
                    break

            name = (
                source[name_node.start_byte:name_node.end_byte]
                if name_node else "<anonymous>"
            )

            res.append(
                FunctionInfo(
                    name=name,
                    start=node.start_point[0] + 1,
                    end=node.end_point[0] + 1,
                    node=node,
                    existing_docstring=None,
                )
            )

        # recursive walk
        for child in node.children:
            walk(child)

    walk(root)
    res.sort(key=lambda x: x.start)
    return res


# --- JavaScript ---
def extract_js_functions(source: str) -> List[FunctionInfo]:
    return _extract_tree_sitter_functions(source, 'javascript')


# --- TypeScript ---
def extract_ts_functions(source: str) -> List[FunctionInfo]:
    return _extract_tree_sitter_functions(source, 'typescript')


# --- Java ---
def extract_java_functions(source: str) -> List[FunctionInfo]:
    return _extract_tree_sitter_functions(source, 'java')


# --- C++ ---
def extract_cpp_functions(source: str) -> List[FunctionInfo]:
    return _extract_tree_sitter_functions(source, 'cpp')
