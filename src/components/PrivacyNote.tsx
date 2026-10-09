/** Says exactly what leaves the device. Shown where the user uploads and where they review new terms. */
export function PrivacyNote() {
  return (
    <p className="hint" data-testid="privacy-note">
      <strong>What leaves your device:</strong> profile contents, names and file names never do. Only when you review a
      custom term, its text (with a hint such as “software”) is sent to Wikipedia to look up a definition. The first
      time a custom term needs a category suggestion, the language model files are downloaded from Hugging Face
      (huggingface.co) and its runtime from jsDelivr (cdn.jsdelivr.net); after that they are cached by your browser.
    </p>
  )
}
