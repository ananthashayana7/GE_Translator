const translateBtn = document.getElementById("translateBtn");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");

translateBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) return;

  outputText.value = "Translating...";
  translateBtn.disabled = true;

  try {
    const response = await fetch(
      "https://translate.argosopentech.com/translate",
      {
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
      }
    );

    if (!response.ok) {
      throw new Error("Network error");
    }

    const data = await response.json();
    outputText.value = data.translatedText || "Translation failed.";
  } catch (error) {
    outputText.value =
      "Translation service temporarily unavailable. Please try again.";
  } finally {
    translateBtn.disabled = false;
  }
});
