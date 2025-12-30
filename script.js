const translateBtn = document.getElementById("translateBtn");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");

translateBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) return;

  outputText.value = "Translating...";
  translateBtn.disabled = true;

  try {
    // LibreTranslate request payload
    const payload = {
      q: text,
      source: "de",
      target: "en",
      format: "text"
    };

    // Wrap request using AllOrigins proxy (CORS-safe)
    const proxyUrl =
      "https://api.allorigins.win/raw?url=" +
      encodeURIComponent("https://translate.argosopentech.com/translate");

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    outputText.value = data.translatedText || "Translation failed.";

  } catch (err) {
    outputText.value =
      "Translation service unavailable. Please try again later.";
  } finally {
    translateBtn.disabled = false;
  }
});
