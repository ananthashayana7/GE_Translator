# DE <-> EN Translator

A lightweight, browser-based **German → English and vice-versa translation tool** built for quick internal use.

The application runs entirely on the client side, requires **no API keys**, **no login**, and can be hosted as a **static site** (for example, on GitHub Pages). It supports translating pasted text as well as uploaded documents.

---

##  Features

DE <-> EN German to English translation
- Paste text directly into the editor
- Upload documents:
  - `.txt`
  - `.pdf`
- Download translated output as:
  - `.txt`
  - `.pdf`
- Handles large documents automatically (no character limit)
- Chunked translation to avoid API size limits
- Clean, modern UI designed for readability
- No API keys, no authentication, no user data stored

---

## How It Works

- The app runs entirely in the browser using HTML, CSS, and JavaScript.
- Entered text is split into smaller chunks and translated sequentially.
- A free public translation service is used behind the scenes.
- Uploaded documents are parsed locally in the browser before translation.
- Translated content can be downloaded in multiple formats.

No backend server is required.

---

## Project Structure

```text
.
├── index.html     
├── style.css    
├── script.js     
└── README.md
