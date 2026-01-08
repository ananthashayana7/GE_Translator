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
    
    resetUIState();
  });

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

  /* ---------- translation with multiple fallbacks ---------- */

  async function translateChunk(text, retryCount = 0) {
    const [sourceLang, targetLang] = currentDirection.split("-");
    
    // Method 1: Google Translate (Primary - Unlimited)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data[0]) {
        const translated = data[0].map(item => item[0]).join('');
        return translated;
      }
    } catch (error) {
      console.log("Google Translate failed, trying backup...");
    }

    // Method 2: Lingva Translate (Backup 1 - Unlimited)
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
      console.log("MyMemory failed, trying final backup...");
    }

    // Method 4: Translate.com API (Backup 3)
    try {
      const url = `https://api.translate.com/translate/v1/mt?source=${sourceLang}&target=${targetLang}&text=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.translation) {
        return data.translation;
      }
    } catch (error) {
      console.log("All translation services failed");
    }

    // If all methods fail and we haven't retried yet
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
        requestAnimationFrame(() => {
          progressBar.style.width = `${Math.round((completed / chunks.length) * 100)}%`;
        });
        
        // Small delay between chunks for stability
        if (completed < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error("Error translating chunk:", error);
        results.push(chunk); // Keep original text if translation fails
        completed++;
      }
    }

    return results.join(" ");
  }

  translateBtn.addEventListener('click', async () => {
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
      outputText.value = "Translation failed. Please check your internet connection and try again.";
      console.error("Translation error:", error);
    }

    translateBtn.disabled = false;
  });

  /* ---------- file upload ---------- */

  fileInput.addEventListener('change', async (e) => {
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
  });

  /* ---------- downloads ---------- */

  downloadTxt.addEventListener('click', () => {
    save(new Blob([outputText.value], { type: "text/plain" }), "translation.txt");
  });

  downloadPdf.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(outputText.value, 180);
    pdf.text(lines, 10, 10);
    pdf.save("translation.pdf");
  });

  function save(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Initialize PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
});
