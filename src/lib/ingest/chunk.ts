export interface RawChunk {
  heading: string;
  text: string;
}

/**
 * Dijeli tekst ugovora na smislene cjeline (klauzule).
 * Prepoznaje hrvatske oznake "Članak N." ; u suprotnom dijeli po odlomcima.
 */
export function chunkContract(input: string): RawChunk[] {
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];

  const hasArticles = /\nČlanak\s+\d+\./.test("\n" + text);

  if (hasArticles) {
    const parts = text.split(/\n(?=Članak\s+\d+\.)/);
    const chunks: RawChunk[] = [];

    const intro = parts[0].trim();
    if (intro) {
      chunks.push({ heading: "Uvodne odredbe i ugovorne strane", text: intro });
    }
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i].trim();
      if (!block) continue;
      const heading = block.split("\n")[0].trim();
      chunks.push({ heading, text: block });
    }
    return chunks;
  }

  // Bez "Članak" oznaka: podijeli po praznim recima u odlomke
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paras.length <= 1) {
    return [{ heading: "Cijeli dokument", text }];
  }

  return paras.map((p, i) => {
    const firstLine = p.split("\n")[0].trim();
    const heading =
      firstLine.length > 0 && firstLine.length <= 80
        ? firstLine
        : `Odlomak ${i + 1}`;
    return { heading, text: p };
  });
}
