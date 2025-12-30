const translateBtn = document.getElementById("translateBtn");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");

translateBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) return;

  outputText.value = "Translating...";
  translateBtn.disabled = true;

  try {
    const url =
      "https://api.mymemory.translated.net/get" +
      "?q=" + encodeURIComponent(text) +
      "&langpair=de|en";

    const response = await fetch(url);
    const data = await response.json();

    if (data?.responseData?.translatedText) {
      outputText.value = data.responseData.translatedText;
    } else {
      outputText.value = "Translation failed.";
    }
  } catch (err) {
    outputText.value =
      "Translation service unavailable. Please try again.";
  } finally {
    translateBtn.disabled = false;
  }
});
