document.getElementById('save').addEventListener('click', () => {
  const selectedLanguage = document.getElementById('language').value;
  chrome.storage.sync.set({ preferredLanguage: selectedLanguage }, () => {
      alert('Preferred language saved!'); // Confirm the language has been saved
      console.log('Saved preferred language:', selectedLanguage); // Log for debugging
  });
});
