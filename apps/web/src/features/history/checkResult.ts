export function checkResult(
  message: string,
  data: Record<string, unknown>,
): "passed" | "failed" | "unknown" {
  if (
    data.result === "failed" ||
    data.passed === false ||
    data.success === false
  )
    return "failed";
  if (data.result === "passed" || data.passed === true || data.success === true)
    return "passed";
  const summary = message.replace(
    /(?<!\d)0\s+(?:failed|failures?|errors?|hata)(?![\p{L}\p{N}_])/giu,
    "",
  );
  if (
    /(?<![\p{L}\p{N}_])(fail(?:ed|ure|ures)?|error(?:s)?|kaldı|başarısız)(?![\p{L}\p{N}_])|✕|❌/iu.test(
      summary,
    )
  )
    return "failed";
  if (
    /(?<![\p{L}\p{N}_])(pass(?:ed)?|success(?:ful)?|geçti|başarılı)(?![\p{L}\p{N}_])|✓|✅/iu.test(
      summary,
    )
  )
    return "passed";
  return "unknown";
}
