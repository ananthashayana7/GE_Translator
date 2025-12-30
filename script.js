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
      const lastPeriod = text.lastIndexOf(".", end);
      const lastSpace = text.lastIndexOf(" ", end);
      const breakPoint = lastPeriod > start ? lastPeriod + 1 : (lastSpace > start ? lastSpace : end);
      end = breakPoint;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks;
}

// Using Google Translate's free API endpoint (no limits, no authentication needed)
async function translateChunk(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
    throw new Error("Translation failed");
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

async function translateUnlimited(text) {
  const chunks = splitIntoChunks(text);
  let translated = [];
  
  for (let i = 0; i < chunks.length; i++) {
    outputText.value = `Translating part ${i + 1} of ${chunks.length}...`;
    
    try {
      const result = await translateChunk(chunks[i]);
      translated.push(result);
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      outputText.value = `Error translating part ${i + 1}. Please try again.`;
      throw error;
    }
  }
  
  return translated.join(" ");
}

translateBtn.onclick = async () => {
  if (!inputText.value.trim()) {
    outputText.value = "Please enter some German text to translate.";
    return;
  }
  
  translateBtn.disabled = true;
  translateBtn.innerHTML = "<span>Translating...</span>";
  
  try {
    outputText.value = "Starting translation...";
    const result = await translateUnlimited(inputText.value);
    outputText.value = result;
  } catch (error) {
    outputText.value = "Translation failed. Please check your internet connection and try again.";
    console.error(error);
  } finally {
    translateBtn.disabled = false;
    translateBtn.innerHTML = "<span>Translate Now</span>";
  }
};

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    if (file.name.endsWith(".txt")) {
      inputText.value = await file.text();
    }
    else if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer()
      });
      inputText.value = result.value;
    }
    else if (file.name.endsWith(".pdf")) {
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
      inputText.value = text;
    }
  } catch (error) {
    alert("Error reading file. Please try again.");
    console.error(error);
  }
};

downloadTxt.onclick = () => {
  if (!outputText.value.trim()) {
    alert("No translation to download");
    return;
  }
  save(new Blob([outputText.value], {type: 'text/plain'}), "translation.txt");
};

downloadDocx.onclick = async () => {
  if (!outputText.value.trim()) {
    alert("No translation to download");
    return;
  }
  try {
    const doc = new docx.Document({
      sections: [{
        children: [new docx.Paragraph(outputText.value)]
      }]
    });
    save(await docx.Packer.toBlob(doc), "translation.docx");
  } catch (error) {
    alert("Error creating document");
    console.error(error);
  }
};

downloadPdf.onclick = () => {
  if (!outputText.value.trim()) {
    alert("No translation to download");
    return;
  }
  try {
    const pdf = new jspdf.jsPDF();
    const lines = pdf.splitTextToSize(outputText.value, 180);
    pdf.text(lines, 15, 15);
    pdf.save("translation.pdf");
  } catch (error) {
    alert("Error creating PDF");
    console.error(error);
  }
};

function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
