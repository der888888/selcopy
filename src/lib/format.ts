import type { GenerateResult, Platform } from "./types";
import { getPlatformTemplate } from "./platforms";
import { attachCompliance } from "./compliance";

export function charLen(text: string) {
  return [...text].length;
}

export function clampText(text: string, max: number) {
  const chars = [...text];
  if (chars.length <= max) return text.trim();
  return chars.slice(0, max).join("").trim();
}

/** 스토어 에디터에 붙이기 쉬운 단순 HTML */
export function toPasteHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h2 style="margin:16px 0 8px;font-size:20px;">${escapeHtml(line.slice(2))}</h2>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h3 style="margin:14px 0 6px;font-size:16px;">${escapeHtml(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith("> ")) {
      closeList();
      html.push(
        `<p style="margin:8px 0;color:#555;">${escapeHtml(line.slice(2))}</p>`,
      );
      continue;
    }
    if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
      if (!inList) {
        html.push('<ul style="margin:8px 0;padding-left:20px;">');
        inList = true;
      }
      const item = line.replace(/^- /, "").replace(/^\d+\.\s/, "");
      html.push(`<li style="margin:4px 0;">${escapeHtml(item)}</li>`);
      continue;
    }
    if (line.startsWith("---") || line.startsWith("*셀카피")) {
      closeList();
      continue;
    }
    closeList();
    html.push(`<p style="margin:8px 0;line-height:1.6;">${escapeHtml(line)}</p>`);
  }
  closeList();
  return html.join("\n");
}

export function toPlainText(markdown: string) {
  return markdown
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function finalizeForPlatform(
  platform: Platform,
  result: GenerateResult,
): GenerateResult {
  const tpl = getPlatformTemplate(platform);
  const titles = (result.titleCandidates || []).map((t) =>
    clampText(t, tpl.titleMaxLen),
  );
  const ads = (result.adCopies || []).map((a) => clampText(a, tpl.adMaxLen));
  const detailMarkdown = result.detailMarkdown || "";
  const detailHtml = toPasteHtml(detailMarkdown);
  const detailPlain = toPlainText(detailMarkdown);

  return attachCompliance({
    ...result,
    detailMarkdown,
    detailHtml,
    detailPlain,
    titleCandidates: titles,
    adCopies: ads,
    optionNames: result.optionNames || [],
    searchKeywords: result.searchKeywords || [],
  });
}

export function lengthMeta(text: string, max: number) {
  const len = charLen(text);
  return {
    len,
    max,
    over: len > max,
    label: `${len}/${max}`,
  };
}
