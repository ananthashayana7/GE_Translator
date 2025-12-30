const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const fileInput = document.getElementById("fileInput");

const downloadTxt = document.getElementById("downloadTxt");
const downloadDocx = document.getElementById("downloadDocx");
const downloadPdf = document.getElementById("downloadPdf");

// Auto-clear output when input is cleared
inputText.addEventListener("input", () => {
  if (!inputText.value.trim()) {
    outputText.value = "";
  }
});

// Faster translation using chunking
async function translateFast(text) {
  const chunks = text.split(/\n{2,}/); // paragraph-based
  const requests = chunks.map(chunk => {
    const url =
      "https://api.mymemory.translated.net/get" +
      "?q=" + encodeURIComponent(chunk) +
      "&langpair=de|en";
    return fetch(url).then(r => r.json());
  });

  const results = await Promise.all(requests);
  return results
    .map(r => r.responseData.translatedText)
    .join("\n\n");
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) return;
  outputText.value = "Translating…";
  outputText.value = await translateFast(inputText.value);
};

// File upload
fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith(".txt")) {
    inputText.value = await file.text();
  }

  if (file.name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
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

// Downloads
downloadTxt.onclick = () => save(new Blob([outputText.value]), "translation.txt");

downloadDocx.onclick = async () => {
  const doc = new docx.Document({
    sections: [{ children: [new docx.Paragraph(outputText.value)] }]
  });
  save(await docx.Packer.toBlob(doc), "translation.docx");
};

downloadPdf.onclick = () => {
  const pdf = new jspdf.jsPDF();
  pdf.text(outputText.value, 10, 10);
  pdf.save("translation.pdf");
};

function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
