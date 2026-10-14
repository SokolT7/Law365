import type { Verification } from "@/lib/research/types";

/**
 * Post-answer check: every [n] must point at a delivered source, stray markers are removed,
 * and substantive paragraphs without any citation are counted for the user.
 */
export function verifyAnswer(text: string, sourceCount: number): { text: string; verification: Verification } {
  const removed: string[] = [];
  const cited = new Set<number>();
  let cleaned = text.replace(/\[(\d{1,3})\]/g, (marker, n) => {
    const index = Number(n);
    if (index >= 1 && index <= sourceCount) { cited.add(index); return marker; }
    removed.push(marker);
    return "";
  });
  // Leftover bracket artefacts such as "[ ]" or "[,]".
  cleaned = cleaned.replace(/\[\s*[,;]?\s*\]/g, "").replace(/[ \t]+([.,;:])/g, "$1").replace(/[ \t]{2,}/g, " ");

  const paragraphs = cleaned.split(/\n{2,}|\n(?=[-*] |\d+\. |\|)/).map((p) => p.trim()).filter(Boolean);
  const uncited = paragraphs.filter((p) => {
    if (/^#{1,4}\s/.test(p) || /^\|?\s*-{3,}/.test(p)) return false;
    const words = p.replace(/[*_#|>-]/g, " ").split(/\s+/).filter(Boolean).length;
    // Short connective sentences and disclaimers do not need a citation.
    if (words < 12 || /napomena|provjerite|nije pravni savjet|ai prijedlog|bez ai obrade/i.test(p)) return false;
    return !/\[\d{1,3}\]/.test(p);
  }).length;

  return {
    text: cleaned.trim(),
    verification: { citedSources: cited.size, totalSources: sourceCount, removedMarkers: removed, uncitedParagraphs: uncited, ok: removed.length === 0 && uncited === 0 && (sourceCount === 0 || cited.size > 0) },
  };
}
