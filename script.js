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

const cache = new Map();

/* ---------- helpers ---------- */

function estimateTime(chars) {
  return Math.ceil(chars / 400) * 0.4;
}

function resetUIState() {
  outputText.value = "";
  progressBar.style.width = "0%";
  progressContainer.classList.remove("active");
  downloads.classList.add("hidden");
  eta.textContent = "ETA: –";
  charCount.textContent = "0 chars";
  fileInput.value = "";
}

function splitText(text, max = 400) {
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

/* ---------- input handling ---------- */

inputText.addEventListener("input", () => {
  const text = inputText.value.trim();
  const len = text.length;

  charCount.textContent = `${len} chars`;
  eta.textContent = len ? `ETA: ${estimateTime(len)}s` : "ETA: –";

  if (!text) {
    resetUIState();
  }
});

/* ---------- translation ---------- */

async function translateChunk(text) {
  if (cache.has(text)) return cache.get(text);

  const hint =
    domainMode.value === "technical"
      ? "Use technical terminology."
      : domainMode.value === "legal"
      ? "Use formal legal language."
      : "";

  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=en&dt=t&q=" +
    encodeURIComponent(hint + " " + text);

  const res = await fetch(url);
  const data = await res.json();
  const translated = data[0].map(x => x[0]).join("");

  cache.set(text, translated);
  return translated;
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

  return results.join("");
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) return;

  translateBtn.disabled = true;
  progressBar.style.width = "0%";
  progressContainer.classList.add("active");
  downloads.classList.add("hidden");
  outputText.value = "Translating…";

  const result = await translateAll(inputText.value);
  outputText.value = result;

  downloads.classList.remove("hidden");
  translateBtn.disabled = false;
};

/* ---------- file upload ---------- */

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  let text = "";

  if (file.name.endsWith(".txt")) {
    text = await file.text();
  } else if (file.name.endsWith(".docx")) {
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = r.value;
  } else if (file.name.endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(x => x.str).join(" ") + "\n";
    }
  }

  inputText.value = text;
  charCount.textContent = `${text.length} chars`;
  eta.textContent = text.trim() ? `ETA: ${estimateTime(text.length)}s` : "ETA: –";

  outputText.value = "";
  progressBar.style.width = "0%";
  progressContainer.classList.remove("active");
  downloads.classList.add("hidden");
};

/* ---------- downloads ---------- */

downloadTxt.onclick = () =>
  save(new Blob([outputText.value]), "translation.txt");

downloadDocx.onclick = async () => {
  const paragraphs = outputText.value.split("\n").map(t => new docx.Paragraph(t));
  const doc = new docx.Document({ sections: [{ children: paragraphs }] });
  save(await docx.Packer.toBlob(doc), "translation.docx");
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
