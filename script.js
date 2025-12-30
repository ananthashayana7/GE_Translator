const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const fileInput = document.getElementById("fileInput");

const downloadTxt = document.getElementById("downloadTxt");
const downloadDocx = document.getElementById("downloadDocx");
const downloadPdf = document.getElementById("downloadPdf");

// ---------------- TRANSLATION ----------------
async function translate(text) {
  const url =
    "https://api.mymemory.translated.net/get" +
    "?q=" + encodeURIComponent(text) +
    "&langpair=de|en";

  const res = await fetch(url);
  const data = await res.json();

  return data.responseData.translatedText
    .replace(/\s+/g, " ")
    .replace(/\.\s*/g, ".\n\n"); // improve readability
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) return;
  outputText.value = "Translating...";
  outputText.value = await translate(inputText.value);
};

// ---------------- FILE UPLOAD ----------------
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith(".txt")) {
    inputText.value = await file.text();
  }

  if (file.name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    inputText.value = result.value;
  }

  if (file.name.endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(i => i.str).join(" ") + "\n";
    }
    inputText.value = text;
  }
};

// ---------------- DOWNLOADS ----------------
downloadTxt.onclick = () => {
  const blob = new Blob([outputText.value], { type: "text/plain" });
  save(blob, "translation.txt");
};

downloadDocx.onclick = async () => {
  const doc = new docx.Document({
    sections: [{ children: [
      new docx.Paragraph(outputText.value)
    ]}]
  });
  const blob = await docx.Packer.toBlob(doc);
  save(blob, "translation.docx");
};

downloadPdf.onclick = () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.text(outputText.value, 10, 10);
  pdf.save("translation.pdf");
};

function save(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
