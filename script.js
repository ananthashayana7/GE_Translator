const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const fileInput = document.getElementById("fileInput");
const progressBar = document.getElementById("progressBar");
const downloads = document.getElementById("downloads");
const charCount = document.getElementById("charCount");
const eta = document.getElementById("eta");
const domainMode = document.getElementById("domainMode");

const cache = new Map();

// --- Utilities ---
function splitText(text, max = 400) {
  const parts = [];
  let i = 0;
  while (i < text.length) {
    let end = i + max;
    if (end < text.length) {
      const s = text.lastIndexOf(" ", end);
      if (s > i) end = s;
    }
    parts.push(text.slice(i, end));
    i = end;
  }
  return parts;
}

function estimateTime(chars) {
  return Math.ceil(chars / 400) * 0.4;
}

// --- UI helpers ---
inputText.addEventListener("input", () => {
  const len = inputText.value.length;
  charCount.textContent = `${len} chars`;
  eta.textContent = `ETA: ${estimateTime(len)}s`;
  if (!inputText.value.trim()) {
    outputText.value = "";
    downloads.classList.add("hidden");
  }
});

// --- Translation ---
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
  const results = [];
  let completed = 0;

  const workers = 2;
  const queue = [...chunks];

  async function worker() {
    while (queue.length) {
      const chunk = queue.shift();
      const result = await translateChunk(chunk);
      results.push(result);
      completed++;
      progressBar.style.width = `${(completed / chunks.length) * 100}%`;
    }
  }

  await Promise.all(Array(workers).fill(0).map(worker));
  return results.join("");
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) return;
  translateBtn.disabled = true;
  progressBar.style.width = "0%";
  outputText.value = "Translating…";

  const result = await translateAll(inputText.value);
  outputText.value = result;
  downloads.classList.remove("hidden");
  translateBtn.disabled = false;
};

// --- File upload ---
fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith(".txt")) {
    inputText.value = await file.text();
  } else if (file.name.endsWith(".docx")) {
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    inputText.value = r.value;
  } else if (file.name.endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const c = await p.getTextContent();
      text += c.items.map(x => x.str).join(" ") + "\n";
    }
    inputText.value = text;
  }
};

// --- Downloads ---
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
}
