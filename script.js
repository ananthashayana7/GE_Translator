// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    return Math.ceil(chars / 1000) * 0.5;
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

  function splitText(text, max = 1000) {
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

  directionToggle.addEventListener('click', function() {
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
    
    // Clear output but keep input
    outputText.value = "";
    progressBar.style.width = "0%";
    progressContainer.classList.remove("active");
    downloads.classList.add("hidden");
    fileInput.value = ""; // Reset file input
  });

  /* ---------- input handling ---------- */

  inputText.addEventListener("input", () => {
    const text = inputText.value.trim();
    const len = text.length;

    charCount.textContent = `${len} chars`;
    eta.textContent = len ? `ETA: ${estimateTime(len)}s` : "ETA: —";

    if (!text) {
      outputText.value = "";
      progressBar.style.width = "0%";
      progressContainer.classList.remove("active");
      downloads.classList.add("hidden");
    }
  });

  /* ---------- translation with multiple fallbacks ---------- */

  async function translateChunk(text, retryCount = 0) {
    const [sourceLang, targetLang] = currentDirection.split("-");
    
    // Method 1: Google Translate (Primary - Unlimited)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data[0]) {
        const translated = data[0].map(item => item[0]).filter(Boolean).join('');
        if (translated && translated.trim()) {
          return translated;
        }
      }
    } catch (error) {
      console.log("Google Translate failed, trying backup...");
    }

    // Method 2: Lingva Translate (Backup 1)
    try {
      const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.translation) {
        return data.translation;
      }
    } catch (error) {
      console.log("Lingva Translate failed, trying next backup...");
    }

    // Method 3: MyMemory (Backup 2)
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    } catch (error) {
      console.log("MyMemory failed");
    }

    // Retry logic
    if (retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return translateChunk(text, retryCount + 1);
    }

    throw new Error("All translation services failed");
  }

  async function translateAll(text) {
    const chunks = splitText(text);
    let completed = 0;
    const results = [];

    progressContainer.classList.add("active");

    for (const chunk of chunks) {
      try {
        const result = await translateChunk(chunk);
        results.push(result);
        completed++;
        
        const progress = Math.round((completed / chunks.length) * 100);
        requestAnimationFrame(() => {
          progressBar.style.width = `${progress}%`;
        });
        
        if (completed < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Error translating chunk:", error);
        results.push(chunk);
        completed++;
      }
    }

    return results.join(" ");
  }

  translateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) {
      alert("Please enter some text to translate");
      return;
    }

    translateBtn.disabled = true;
    translateBtn.textContent = "Translating...";
    progressBar.style.width = "0%";
    progressContainer.classList.add("active");
    downloads.classList.add("hidden");
    outputText.value = "Translating…";

    try {
      const result = await translateAll(text);
      outputText.value = result;
      downloads.classList.remove("hidden");
    } catch (error) {
      outputText.value = "Translation failed. Please check your internet connection and try again.";
      console.error("Translation error:", error);
    }

    translateBtn.disabled = false;
    translateBtn.textContent = "Translate";
  });

  /* ---------- FIXED: file upload ---------- */

  fileInput.addEventListener('change', async (e) => {
    // Get the selected file
    const file = e.target.files[0];
    if (!file) return;

    console.log(`File selected: ${file.name}, Current direction: ${currentDirection}`);

    let text = "";

    try {
      // Read TXT files
      if (file.name.toLowerCase().endsWith(".txt")) {
        text = await file.text();
        console.log(`TXT file loaded: ${text.length} chars`);
      } 
      // Read PDF files
      else if (file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          
          console.log(`PDF loaded: ${pdf.numPages} pages`);
          
          // Extract text from all pages
          const textPromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            textPromises.push(
              pdf.getPage(i).then(page => {
                return page.getTextContent().then(content => {
                  return content.items.map(item => item.str).join(" ");
                });
              })
            );
          }
          
          const pageTexts = await Promise.all(textPromises);
          text = pageTexts.join("\n");
          console.log(`PDF text extracted: ${text.length} chars`);
        } catch (pdfError) {
          console.error("PDF extraction error:", pdfError);
          alert("Error reading PDF file. Please try a different file.");
          fileInput.value = "";
          return;
        }
      } else {
        alert("Please upload a .txt or .pdf file only");
        fileInput.value = "";
        return;
      }

      // Validate text content
      if (!text || text.trim().length === 0) {
        alert("The file appears to be empty. Please try a different file.");
        fileInput.value = "";
        return;
      }

      // Update UI with extracted text
      inputText.value = text;
      charCount.textContent = `${text.length} chars`;
      eta.textContent = `ETA: ${estimateTime(text.length)}s`;

      // Clear previous output
      outputText.value = "";
      progressBar.style.width = "0%";
      progressContainer.classList.remove("active");
      downloads.classList.add("hidden");
      
      console.log(`File successfully loaded in ${currentDirection} mode. Ready to translate.`);
      
    } catch (error) {
      console.error("File read error:", error);
      alert(`Error reading file: ${error.message}. Please try again.`);
      fileInput.value = "";
    }
  });

  /* ---------- downloads ---------- */

  downloadTxt.addEventListener('click', () => {
    if (!outputText.value.trim()) {
      alert("No translation to download");
      return;
    }
    const blob = new Blob([outputText.value], { type: "text/plain;charset=utf-8" });
    save(blob, "translation.txt");
  });

  downloadPdf.addEventListener('click', () => {
    if (!outputText.value.trim()) {
      alert("No translation to download");
      return;
    }
    
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      const lines = pdf.splitTextToSize(outputText.value, 180);
      pdf.text(lines, 10, 10);
      pdf.save("translation.pdf");
    } catch (error) {
      console.error("PDF creation error:", error);
      alert("Error creating PDF. Please try downloading as TXT instead.");
    }
  });

  function save(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
  }

  // Initialize PDF.js worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  console.log("Translator ready. Current direction:", currentDirection);
});
