const translateBtn = document.getElementById("translateBtn");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");

translateBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) return;

  outputText.value = "Translating...";

  try {
    const response = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: text,
        source: "de",
        target: "en",
        format: "text"
      })
    });

    const data = await response.json();
    outputText.value = data.translatedText || "Translation failed.";
  } catch (err) {
    outputText.value = "Error connecting to translation service.";
  }
});
