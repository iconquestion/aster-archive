(() => {
  const puzzleStorageKey = "archive_key_24";
  const puzzleSeed = "n2w0";
  const puzzleEncodedHex = "085e16574300431d000000000d0b1b011a0a";

  function persistPuzzleKey() {
    localStorage.setItem(puzzleStorageKey, puzzleSeed);
  }

  function buildFinalFlag() {
    const seed = localStorage.getItem(puzzleStorageKey) || "";
    if (!seed) {
      return "";
    }

    return puzzleEncodedHex
      .match(/.{1,2}/g)
      .map((pair) => parseInt(pair, 16))
      .map((value, index) => String.fromCharCode(value ^ seed.charCodeAt(index % seed.length)))
      .join("");
  }

  window.persistPuzzleKey = persistPuzzleKey;
  window.buildFinalFlag = buildFinalFlag;
})();
