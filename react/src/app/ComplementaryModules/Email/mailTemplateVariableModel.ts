import { cleanEditorHtml, plainMailHtml } from '../../components/mail-editor/mailFormat';

type Content = { subject: string; bodyText: string; bodyHtml: string | null };
const tokens = () => /\{\{([^{}]+)\}\}/g;

export function mailTemplateVariables(subject: string, text: string): string[] {
  return [...new Set(Array.from(`${subject}\n${text}`.matchAll(tokens()), match => match[1].trim()))];
}

function replaceVariables(text: string, values: ReadonlyMap<string, string>): string {
  return text.replace(tokens(), (token, name: string) => values.get(name.trim())?.trim() || token);
}

/** Resolve visible text only. HTML attributes and inline image bytes are never interpolated. */
export function resolveMailTemplateVariables(content: Content, values: ReadonlyMap<string, string>): Content {
  const container = document.createElement('div');
  container.innerHTML = cleanEditorHtml(content.bodyHtml ?? plainMailHtml(content.bodyText));
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number; end: number }[] = [];
  let source = '', node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? '';
    nodes.push({ node: node as Text, start: source.length, end: source.length + text.length });
    source += text;
  }
  // A placeholder may span bold/colour nodes. Work backwards so earlier offsets stay valid.
  for (const match of Array.from(source.matchAll(tokens())).reverse()) {
    const value = values.get(match[1].trim())?.trim();
    if (!value) continue;
    const start = match.index!, end = start + match[0].length;
    const first = nodes.find(part => part.end > start);
    const last = nodes.find(part => part.end >= end);
    if (!first || !last) continue;
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    range.deleteContents();
    range.insertNode(document.createTextNode(value));
  }
  return {
    subject: replaceVariables(content.subject, values),
    bodyText: replaceVariables(content.bodyText, values),
    bodyHtml: container.innerHTML,
  };
}
