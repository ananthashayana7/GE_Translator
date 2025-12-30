const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const fileInput = document.getElementById("fileInput");
const downloadTxt = document.getElementById("downloadTxt");
const downloadDocx = document.getElementById("downloadDocx");
const downloadPdf = document.getElementById("downloadPdf");

inputText.addEventListener("input", () => {
  if (!inputText.value.trim()) {
    outputText.value = "";
  }
});

function splitIntoChunks(text, maxLength = 500) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// Multiple translation API endpoints with fallback
const translationAPIs = [
  {
    name: "LibreTranslate",
    translate: async (text) => {
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "de",
          target: "en",
          format: "text"
        })
      });
      const data = await response.json();
      if (data.translatedText) return data.translatedText;
      throw new Error("Translation failed");
    }
  },
  {
    name: "MyMemory",
    translate: async (text) => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=de|en`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      throw new Error("Translation failed");
    }
  },
  {
    name: "Lingva",
    translate: async (text) => {
      const response = await fetch(`https://lingva.ml/api/v1/de/en/${encodeURIComponent(text)}`);
      const data = await response.json();
      if (data.translation) return data.translation;
      throw new Error("Translation failed");
    }
  }
];

async function translateWithFallback(text) {
  for (let api of translationAPIs) {
    try {
      return await api.translate(text);
    } catch (error) {
      console.log(`${api.name} failed, trying next...`);
      continue;
    }
  }
  throw new Error("All translation services failed. Please try again later.");
}

async function translateUnlimited(text) {
  const chunks = splitIntoChunks(text);
  let translated = [];
  
  for (let i = 0; i < chunks.length; i++) {
    outputText.value = `Translating ${i + 1} / ${chunks.length}…`;
    try {
      const result = await translateWithFallback(chunks[i]);
      translated.push(result);
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      outputText.value = `Error: ${error.message}`;
      return;
    }
  }
  
  return translated.join(" ");
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) return;
  translateBtn.disabled = true;
  translateBtn.innerHTML = "<span>Translating...</span>";
  
  try {
    outputText.value = "Preparing translation…";
    outputText.value = await translateUnlimited(inputText.value);
  } catch (error) {
    outputText.value = "Translation error. Please try again.";
  } finally {
    translateBtn.disabled = false;
    translateBtn.innerHTML = "<span>Translate Now</span>";
  }
};

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.name.endsWith(".txt")) {
    inputText.value = await file.text();
  }
  if (file.name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer()
    });
    inputText.value = result.value;
  }
  if (file.name.endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument(
      await file.arrayBuffer()
    ).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(i => i.str).join(" ") + "\n";
    }
    inputText.value = text;
  }
};

downloadTxt.onclick = () =>
  save(new Blob([outputText.value]), "translation.txt");

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
