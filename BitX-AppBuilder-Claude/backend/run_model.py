import os
import sys
import json
import time
from dotenv import load_dotenv
from llama_cpp import Llama

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "./models/starcoder2-7b.Q4_0.gguf")
MAX_TOKENS = 1024
TEMPERATURE = 0.2
TOP_P = 0.95

def format_prompt(user_prompt):
    return f"""
You are a professional AI full-stack app generator.
Your ONLY task is to return clean JSON in this exact format:

{{
  "frontend": "// React code goes here",
  "backend": "// Express.js + Node backend code goes here"
}}

ONLY return JSON.
DO NOT include markdown, explanations, or anything else.
DO NOT include README or tutorial content.

PROMPT:
{user_prompt}
"""

def main():
    if len(sys.argv) < 2:
        print("❌ Prompt missing")
        return

    user_prompt = sys.argv[1]
    prompt = format_prompt(user_prompt)

    print("Sending prompt to model...")

    llm = Llama(model_path=MODEL_PATH, n_ctx=2048)
    start = time.time()
    result = llm(
        prompt,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
        top_p=TOP_P,
        stop=["```", "'''", "---", "\n\n\n", "</html>", "</code>"]
    )
    duration = time.time() - start
    output = result["choices"][0]["text"]

    print(f"📥 Output received in {duration:.2f} sec.")
    print("\n=== RAW OUTPUT START ===")
    print(output)
    print("=== RAW OUTPUT END ===")

    try:
        first = output.index('{')
        last = output.rindex('}') + 1
        json_data = json.loads(output[first:last])
        print(json.dumps(json_data, indent=2))
    except Exception as e:
        print("⚠️ Failed to parse JSON. Showing raw output.")
        print(json.dumps({
            "frontend": "// Model output failed to parse cleanly.",
            "backend": output
        }, indent=2))

if __name__ == "__main__":
    main()
