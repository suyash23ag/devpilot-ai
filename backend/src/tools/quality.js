// Deliberately approximate: this is a review cue, not a language parser or complexity proof.
export function inspectFunctions(lines) {
  const findings = [];
  for (let i = 0; i < lines.length && findings.length < 30; i++) {
    const match = lines[i].match(/\b(function|def)\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (!match) continue;
    const name = match[2];
    if (/^(?:[a-z]{1,2}|tmp\d*|foo|bar)$/i.test(name))
      findings.push({
        line: i + 1,
        title: "Potentially unclear function name",
        description: `The name ${name} provides little domain context; short names may still be appropriate here.`,
        recommendation:
          "Consider a name that describes the function’s responsibility.",
        confidence: "low",
      });
    let end = i,
      depth = 0,
      opened = false;
    if (match[1] === "def") {
      const indent = lines[i].match(/^\s*/)[0].length;
      while (end + 1 < Math.min(lines.length, i + 200)) {
        const next = lines[end + 1];
        if (next.trim() && next.match(/^\s*/)[0].length <= indent) break;
        end++;
      }
    } else {
      for (end = i; end < Math.min(lines.length, i + 200); end++) {
        for (const character of lines[end]) {
          if (character === "{") {
            depth++;
            opened = true;
          }
          if (character === "}") depth--;
        }
        if (opened && depth <= 0) break;
      }
      if (!opened) continue;
    }
    const body = lines.slice(i, end + 1).join("\n");
    const branches = (
      body.match(/\b(?:if|for|while|case|catch|elif|except)\b|&&|\|\|/g) || []
    ).length;
    if (end - i + 1 > 80)
      findings.push({
        line: i + 1,
        title: "Potentially long function",
        description: `${name} spans approximately ${end - i + 1} lines in a bounded lexical scan.`,
        recommendation:
          "Review whether smaller cohesive functions would be easier to maintain.",
        confidence: "low",
      });
    if (branches > 12)
      findings.push({
        line: i + 1,
        title: "Branch-heavy function requires review",
        description: `${name} contains approximately ${branches} branch markers. Comments and strings can affect this heuristic.`,
        recommendation:
          "Review nested decisions and consider extracting independent paths with focused tests.",
        confidence: "low",
      });
  }
  return findings;
}
