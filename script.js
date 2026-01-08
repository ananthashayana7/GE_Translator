const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const fileInput = document.getElementById("fileInput");

const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressContainer");

const downloads = document.getElementById("downloads");
const charCount = document.getElementById("charCount");
const eta = document.getElementById("eta");
const domainMode = document.getElementById("domainMode");

const directionToggle = document.getElementById("directionToggle");
const directionLabel = document.getElementById("directionLabel");
const sourceLabel = document.getElementById("sourceLabel");
const targetLabel = document.getElementById("targetLabel");

const downloadTxt = document.getElementById("downloadTxt");
const downloadPdf = document.getElementById("downloadPdf");

let currentDirection = "de-en"; // "de-en" or "en-de"

/* ---------- helpers ---------- */

function estimateTime(chars) {
  return Math.ceil(chars / 2000) * 2;
}

function resetUIState() {
  outputText.value = "";
  progressBar.style.width = "0%";
  progressContainer.classList.remove("active");
  downloads.classList.add("hidden");
  eta.textContent = "ETA: —";
  charCount.textContent = "0 chars";
  fileInput.value = "";
}

function splitText(text, max = 2000) {
  const parts = [];
  let i = 0;
  while (i < text.length) {
    let end = i + max;
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > i) end = space;
    }
    parts.push(text.slice(i, end));
    i = end;
  }
  return parts;
}

/* ---------- direction toggle ---------- */

directionToggle.onclick = () => {
  if (currentDirection === "de-en") {
    currentDirection = "en-de";
    directionLabel.textContent = "EN → DE";
    sourceLabel.textContent = "English";
    targetLabel.textContent = "German";
    inputText.placeholder = "Paste English text here…";
  } else {
    currentDirection = "de-en";
    directionLabel.textContent = "DE → EN";
    sourceLabel.textContent = "German";
    targetLabel.textContent = "English";
    inputText.placeholder = "Paste German text here…";
  }
  resetUIState();
};

/* ---------- input handling ---------- */

inputText.addEventListener("input", () => {
  const text = inputText.value.trim();
  const len = text.length;

  charCount.textContent = `${len} chars`;
  eta.textContent = len ? `ETA: ${estimateTime(len)}s` : "ETA: —";

  if (!text) {
    resetUIState();
  }
});

/* ---------- translation ---------- */

async function translateChunk(text) {
  const domainHint = {
    technical: " Use precise technical terminology.",
    legal: " Use formal legal language and appropriate terminology.",
    general: ""
  }[domainMode.value];

  const [sourceLang, targetLang] = currentDirection.split("-");
  const sourceName = sourceLang === "de" ? "German" : "English";
  const targetName = targetLang === "de" ? "German" : "English";

  const prompt = `Translate the following ${sourceName} text to ${targetName}.${domainHint} Provide ONLY the translation, no explanations or additional text.

${text}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        { role: "user", content: prompt }
      ],
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

async function translateAll(text) {
  const chunks = splitText(text);
  let completed = 0;
  const results = [];

  progressContainer.classList.add("active");

  for (const chunk of chunks) {
    const result = await translateChunk(chunk);
    results.push(result);
    completed++;
    requestAnimationFrame(() => {
      progressBar.style.width = `${Math.round((completed / chunks.length) * 100)}%`;
    });
  }

  return results.join(" ");
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) return;

  translateBtn.disabled = true;
  progressBar.style.width = "0%";
  progressContainer.classList.add("active");
  downloads.classList.add("hidden");
  outputText.value = "Translating…";

  try {
    const result = await translateAll(inputText.value);
    outputText.value = result;
    downloads.classList.remove("hidden");
  } catch (error) {
    outputText.value = "Translation failed. Please try again.";
    console.error(error);
  }

  translateBtn.disabled = false;
};

/* ---------- file upload ---------- */

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  let text = "";

  try {
    if (file.name.endsWith(".txt")) {
      text = await file.text();
    } else if (file.name.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(x => x.str).join(" ") + "\n";
      }
    }

    inputText.value = text;
    charCount.textContent = `${text.length} chars`;
    eta.textContent = text.trim() ? `ETA: ${estimateTime(text.length)}s` : "ETA: —";

    outputText.value = "";
    progressBar.style.width = "0%";
    progressContainer.classList.remove("active");
    downloads.classList.add("hidden");
  } catch (error) {
    alert("Error reading file. Please try again.");
    console.error(error);
  }
};

/* ---------- downloads ---------- */

downloadTxt.onclick = () => {
  save(new Blob([outputText.value], { type: "text/plain" }), "translation.txt");
};

downloadPdf.onclick = () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(outputText.value, 180);
  pdf.text(lines, 10, 10);
  pdf.save("translation.pdf");
};

function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
