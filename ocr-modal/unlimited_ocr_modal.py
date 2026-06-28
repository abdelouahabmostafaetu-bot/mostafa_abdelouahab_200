"""
Unlimited-OCR served on Modal as a simple, secure HTTPS API.

This file is deployed to Modal (a serverless GPU cloud). It downloads the
baidu/Unlimited-OCR model, keeps it warm on a GPU only while it is being used,
and exposes ONE POST endpoint that takes an image and returns the recognized
text / LaTeX.

See README.md in this same folder for the exact, beginner-friendly deploy steps.
"""

import base64
import os
import tempfile

import modal

APP_NAME = "unlimited-ocr"
MODEL_NAME = "baidu/Unlimited-OCR"
CACHE_DIR = "/cache"

# The cloud container image: Python + the exact libraries the model needs.
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install(
        "torch==2.10.0",
        "torchvision==0.25.0",
        "transformers==4.57.1",
        "Pillow==12.1.1",
        "einops==0.8.2",
        "addict==2.4.0",
        "easydict==1.13",
        "pymupdf==1.27.2.2",
        "accelerate",
        "safetensors",
        "fastapi[standard]",
    )
)

app = modal.App(APP_NAME)

# Persistent cache so the ~6 GB model is downloaded only once.
volume = modal.Volume.from_name("unlimited-ocr-cache", create_if_missing=True)


@app.cls(
    image=image,
    gpu="T4",
    volumes={CACHE_DIR: volume},
    timeout=600,
    secrets=[modal.Secret.from_name("ocr-token")],
)
class OCR:
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoModel, AutoTokenizer

        os.environ["HF_HOME"] = CACHE_DIR
        self.tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME, trust_remote_code=True, cache_dir=CACHE_DIR
        )
        model = AutoModel.from_pretrained(
            MODEL_NAME,
            trust_remote_code=True,
            use_safetensors=True,
            torch_dtype=torch.bfloat16,
            cache_dir=CACHE_DIR,
        )
        self.model = model.eval().cuda()

    @modal.method()
    def run_ocr(self, image_bytes: bytes, prompt: str) -> str:
        tmp_dir = tempfile.mkdtemp(prefix="ocr_")
        img_path = os.path.join(tmp_dir, "input.jpg")
        out_dir = os.path.join(tmp_dir, "out")
        os.makedirs(out_dir, exist_ok=True)
        with open(img_path, "wb") as handle:
            handle.write(image_bytes)

        used_prompt = prompt or "<image>document parsing."
        result = self.model.infer(
            self.tokenizer,
            prompt=used_prompt,
            image_file=img_path,
            output_path=out_dir,
            base_size=1024,
            image_size=640,
            crop_mode=True,
            max_length=32768,
            no_repeat_ngram_size=35,
            ngram_window=128,
            save_results=True,
        )

        nl = chr(10)
        text = result if isinstance(result, str) else ""
        # Fallback: read whatever text/markdown the model saved to disk.
        if not text.strip():
            for name in sorted(os.listdir(out_dir)):
                if name.endswith((".mmd", ".md", ".txt")):
                    full = os.path.join(out_dir, name)
                    with open(full, "r", encoding="utf-8") as handle:
                        text += handle.read() + nl
        return text.strip()


@app.function(image=image, secrets=[modal.Secret.from_name("ocr-token")])
@modal.fastapi_endpoint(method="POST")
def ocr(data: dict):
    # Token check (token travels in the JSON body over HTTPS).
    expected = os.environ.get("OCR_TOKEN", "")
    token = data.get("token", "")
    if not expected or token != expected:
        return {"error": "Invalid or missing token."}

    image_base64 = data.get("image_base64", "")
    if not image_base64:
        return {"error": "Missing image_base64."}

    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception:
        return {"error": "image_base64 is not valid base64."}

    prompt = data.get("prompt", "")
    text = OCR().run_ocr.remote(image_bytes, prompt)
    return {"text": text}
