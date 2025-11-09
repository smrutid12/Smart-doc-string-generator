# wrapper around OpenAI calls
import os
import json
from typing import Dict
import openai
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

async def generate_docstring(function_name: str, function_code: str, max_tokens: int = 256) -> Dict:
    """
    Call OpenAI to generate a docstring for a single function.
    Returns parsed JSON with keys: function_name and docstring.
    """
    # careful: keep prompt concise and deterministic
    prompt = f"""
You are an expert Python developer and documentation assistant.
Given the following Python function, generate a clean PEP-257/Python-style docstring that explains:
- the function's purpose in one sentence
- descriptions for each parameter (name and role)
- the return value and its type
If there are exceptions raised, mention them.

Return strictly as JSON with keys:
{{"function_name": "<function_name>", "docstring": "<docstring_text>"}}

Function:
{function_code}
"""
    # For asyncio compatibility we use the sync client in a thread — openai python libs are sync.
    # If using OpenAI's async client, adjust accordingly.
    resp = openai.Completion.create(
        engine="gpt-4o-mini",  # replace with appropriate model
        prompt=prompt,
        max_tokens=max_tokens,
        temperature=0.0,
        stop=None
    )
    text = resp.choices[0].text.strip()
    # try to load JSON from the response
    try:
        parsed = json.loads(text)
    except Exception:
        # fallback: try to extract JSON substring
        import re
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ValueError("Could not parse model response as JSON: " + text[:200])
        parsed = json.loads(m.group(0))
    return parsed
