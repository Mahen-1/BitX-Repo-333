import sys
import os
from dotenv import load_dotenv
from gpt4all import GPT4All

# Load environment variables from .env
load_dotenv()

# Get model config from .env
model_dir = os.getenv("MODEL_DIR")
model_name = os.getenv("MODEL_NAME")

# Ensure these are set
if not model_dir or not model_name:
    raise ValueError("MODEL_DIR or MODEL_NAME is not set in .env")

# Initialize model
model = GPT4All(
    model_name=model_name,
    model_path=model_dir,
    backend='llama'  # Ensure you have llama backend support
)

# Read prompt from command line
if len(sys.argv) < 2:
    print("Usage: python run.py \"your prompt here\"")
    sys.exit(1)

prompt = sys.argv[1]
output = model.generate(prompt)

print(output)
