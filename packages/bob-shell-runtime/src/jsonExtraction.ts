import { BobJsonExtractionError, type ExtractedJsonResult } from './bobShellTypes';

export function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export function extractJsonObjectText(text: string): string {
  const withoutFence = stripMarkdownCodeFence(text);
  const first = withoutFence.indexOf('{');
  const last = withoutFence.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) {
    throw new BobJsonExtractionError('IBM Bob Shell output did not contain a JSON object.');
  }
  return withoutFence.slice(first, last + 1);
}

export function extractAndParseJson(text: string): ExtractedJsonResult {
  const extracted = extractJsonObjectText(text);
  try {
    return {
      raw_text: text,
      extracted_text: extracted,
      parsed: JSON.parse(extracted)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON parse error';
    throw new BobJsonExtractionError(`IBM Bob Shell output contained invalid JSON: ${message}`);
  }
}
