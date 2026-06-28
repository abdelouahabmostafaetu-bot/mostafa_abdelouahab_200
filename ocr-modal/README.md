# Unlimited-OCR on Modal (step-by-step)

This folder deploys the **baidu/Unlimited-OCR** model to **Modal** (a serverless
GPU cloud with $30/month of free credit) and exposes it as a private HTTPS API
that your website can call.

You only have to do all of this **once**. Take it slowly, one step at a time.

---

## 1. Create a Modal account
Go to https://modal.com and sign up with your **GitHub** or **Google** account.

- Free tier: **$30/month** of GPU credit.
- Optional but smart: on https://modal.com/settings you can add a card and set a
  **$30 spending limit**, so you can never be charged more than the free credit.
- IMPORTANT: only enter card details on the official modal.com site — never paste
  them anywhere else.

## 2. Install the Modal tool
You need **Python 3** installed on your computer. Then open a terminal and run:

    pip install modal
    modal setup

`modal setup` opens your browser to log you in. Click approve.

## 3. Create your secret password (the API token)
Pick any strong password (a long random string is best). Then run this command,
but replace `MY_SECRET_TOKEN` with your own password:

    modal secret create ocr-token OCR_TOKEN=MY_SECRET_TOKEN

Keep this token safe — you will give it to your website later.

## 4. Deploy
From the top folder of this repository, run:

    modal deploy ocr-modal/unlimited_ocr_modal.py

The first deploy takes a few minutes (it builds the GPU image and downloads the
model). When it finishes, Modal prints a URL that ends in `.modal.run`, like:

    https://yourname--unlimited-ocr-ocr.modal.run

## 5. Send me two things
1. The `.modal.run` URL it printed.
2. The token you chose in step 3.

(Or add them yourself in Vercel as environment variables: `OCR_API_URL` and
`OCR_API_TOKEN`.)

Then I will connect your Math AI image upload to this OCR endpoint, so photos are
read by Unlimited-OCR first and then solved.

---

## Optional: test it yourself
Replace URL and TOKEN, and paste a base64 image string:

    curl -X POST "URL" -H "Content-Type: application/json" -d '{"token":"TOKEN","image_base64":"BASE64_HERE","prompt":"<image>document parsing."}'

A good response looks like: `{"text":"...recognized text..."}`

## Notes
- The GPU only runs while a request is being processed, then scales to zero, so
  idle time is free.
- The very first request after idle is slow (cold start) while the model loads;
  after that it is fast.
- If the recognized text comes back empty, tell me — we may need to adjust how we
  read the model output, which is a small change in unlimited_ocr_modal.py.
