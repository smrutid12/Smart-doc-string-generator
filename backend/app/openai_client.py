import os
import json
import re
import logging
from groq import AsyncGroq
from dotenv import load_dotenv

from app.utils import indent_docstring

# Load env
load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

logger = logging.getLogger("doc_generator")


# -------------------------------
# JSON CLEANING HELPERS
# -------------------------------

def extract_json(text: str) -> str:
    """Extract JSON object from model output."""
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in model output")
    return match.group(0)


def clean_json_string(json_str: str) -> str:
    """
    Clean and normalize model JSON safely.
    Fixes:
    - Triple quotes
    - Trailing commas
    DOES NOT break apostrophes
    """

    def replace_triple_quotes(match):
        prefix = match.group(1)
        content = match.group(2)
        return prefix + json.dumps(content.strip("\n"))

    # Handle """ docstring """
    json_str = re.sub(
        r'("docstring"\s*:\s*)"""([\s\S]*?)"""',
        replace_triple_quotes,
        json_str,
    )

    # Handle ''' docstring '''
    json_str = re.sub(
        r'("docstring"\s*:\s*)\'\'\'([\s\S]*?)\'\'\'',
        replace_triple_quotes,
        json_str,
    )

    # Remove trailing commas
    json_str = re.sub(r",\s*}", "}", json_str)
    json_str = re.sub(r",\s*]", "]", json_str)

    return json_str


def safe_parse_json(json_str: str, function_name: str) -> dict:
    """Parse JSON safely with fallback."""
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(
            f"JSON parsing failed for {function_name}: {e}\nOutput:\n{json_str[:500]}"
        )

        # 🚨 BACKUP fallback (VERY IMPORTANT)
        return {
            "function_name": function_name,
            "docstring": f"TODO: Add docstring for `{function_name}`.",
            "fallback": True,
            "error": str(e),
        }


# -------------------------------
# MAIN FUNCTION
# -------------------------------

async def generate_docstring(
    function_language: str,
    function_name: str,
    function_code: str,
    function_format: str,
    max_tokens: int = 512,
):
    prompt = f"""
You are an expert {function_language} developer and documentation assistant.

Generate a {function_format} docstring/comment for this function.

STRICT RULES:
- Return ONLY the docstring/comment text.
- Do NOT return JSON.
- Do NOT wrap the response in markdown.
- Do NOT add explanations.
- For JavaScript/TypeScript, return valid JSDoc.
- For Java/C/C++, return valid block comment documentation.
- For Python, return only the docstring content without triple quotes.

Function name:
{function_name}

Function:
{function_code}
""".strip()

    response = await client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": "Return only the requested docstring/comment text. No JSON. No markdown.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
        max_tokens=max_tokens,
    )

    docstring = response.choices[0].message.content.strip()

    print("\n=== RAW MODEL OUTPUT ===\n", docstring, "\n========================\n")

    indent_match = re.search(r"\n(\s+)\w", function_code)
    indent = indent_match.group(1) if indent_match else "    "

    return {
        "function_name": function_name,
        "docstring": indent_docstring(docstring, indent),
    }