import os
import json
import re
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))


def clean_json_string(json_str: str) -> str:
    """Clean and normalize the model’s JSON-like output."""
    # Remove Python triple quotes and replace with valid JSON strings
    json_str = re.sub(r'"""(.*?)"""', lambda m: json.dumps(m.group(1)), json_str, flags=re.DOTALL)
    json_str = re.sub(r"'''(.*?)'''", lambda m: json.dumps(m.group(1)), json_str, flags=re.DOTALL)
    # Replace single quotes with double quotes for valid JSON
    json_str = json_str.replace("'", '"')
    # Trim whitespace and trailing commas
    json_str = re.sub(r",\s*}", "}", json_str)
    json_str = re.sub(r",\s*]", "]", json_str)
    return json_str


async def generate_docstring(function_language:str, function_name: str, function_code: str, function_format:str, max_tokens: int = 256):
    prompt = f"""
        You are an expert {function_language} developer and documentation assistant.
        Given the following {function_language} function, generate a full **PEP-257 compliant docstring** that includes
        a short description, Args, Returns, and Examples if applicable.

        Return your answer STRICTLY as valid JSON (no markdown, no ``` blocks, no explanation, no {function_language} code outside JSON):
        {{
        "function_name": "{function_name}",
        "docstring": "Full {function_format} docstring text here".
        }}

        Function code:
        {function_code}
    """.strip()

    response = await client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a precise JSON-only Python docstring generator."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
        max_tokens=max_tokens,
    )

    text = response.choices[0].message.content.strip()
    print("\n=== RAW MODEL OUTPUT ===\n", text, "\n========================\n")

    # Extract JSON section only
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("No JSON found in model output:\n" + text[:300])
    json_str = clean_json_string(match.group(0))

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON after cleaning: {e}\nOutput:\n{json_str[:300]}")

    return parsed
