import { useEffect, useRef } from 'react';
import { Bold, Italic, List, RemoveFormatting } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useMailDailyCopy } from './mailDailyCopy';

export function plainMailHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
/** Small formatting surface for drafts. The server sanitizer remains authoritative. */
export function cleanEditorHtml(html: string) {
  const template = document.createElement('template'); template.innerHTML = html;
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return plainMailHtml(node.textContent ?? '');
    if (!(node instanceof Element)) return '';
    if (['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','FORM','IMG'].includes(node.tagName)) return '';
    const body = Array.from(node.childNodes).map(clean).join('');
    const tag = node.tagName.toLowerCase();
    return tag === 'br' ? '<br>' : ['b','strong','i','em','u','s','p','div','ul','ol','li','blockquote'].includes(tag) ? `<${tag}>${body}</${tag}>` : body;
  };
  return Array.from(template.content.childNodes).map(clean).join('');
}
export function MailRichEditor({ text, html, disabled, label, onChange }: {
  text: string; html: string | null; disabled: boolean; label: string; onChange: (text: string, html: string) => void;
}) {
  const copy = useMailDailyCopy(); const editor = useRef<HTMLDivElement>(null); const emitted = useRef<string | null>(null);
  useEffect(() => {
    const value = html ?? plainMailHtml(text);
    if (editor.current && emitted.current !== value) { editor.current.innerHTML = cleanEditorHtml(value); emitted.current = value; }
  }, [html, text]);
  function changed() {
    const node = editor.current; if (!node) return;
    const markup = cleanEditorHtml(node.innerHTML); emitted.current = markup;
    onChange(node.innerText.replace(/\r/g, ''), markup);
  }
  function insert(node: Node) {
    const selection = window.getSelection(); const root = editor.current; if (!root || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0); if (!root.contains(range.commonAncestorContainer)) return;
    range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); changed();
  }
  function format(kind: 'b' | 'i' | 'ul' | 'plain') {
    const root = editor.current; if (!root || disabled) return;
    if (kind === 'plain') { root.innerHTML = plainMailHtml(root.innerText); changed(); root.focus(); return; }
    const selection = window.getSelection(); if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0); if (!root.contains(range.commonAncestorContainer) || range.collapsed) return;
    const wrapper = document.createElement(kind);
    if (kind === 'ul') {
      for (const line of range.toString().split('\n').filter(Boolean)) { const item = document.createElement('li'); item.textContent = line; wrapper.append(item); }
      range.deleteContents();
    } else wrapper.append(range.extractContents());
    range.insertNode(wrapper); range.selectNodeContents(wrapper); selection.removeAllRanges(); selection.addRange(range); changed();
  }
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-400 dark:border-slate-700 dark:bg-slate-900">
    <div role="toolbar" aria-label={label} className="flex gap-1 border-b border-slate-100 bg-blue-50/50 px-2 py-1 dark:border-slate-700 dark:bg-blue-950/30">
      {([{kind:'b',label:copy.bold,Icon:Bold},{kind:'i',label:copy.italic,Icon:Italic},{kind:'ul',label:copy.bullets,Icon:List},{kind:'plain',label:copy.plain,Icon:RemoveFormatting}] as const).map(({kind,label,Icon}) => <Button key={kind} type="button" variant="ghost" className="h-11 w-11 p-0" disabled={disabled} aria-label={label} title={label} onMouseDown={e=>e.preventDefault()} onClick={()=>format(kind)}><Icon className="h-4 w-4" /></Button>)}
    </div>
    <div ref={editor} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true" aria-disabled={disabled} className="mail-rich-editor min-h-52 max-h-80 overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm outline-none" onInput={changed}
      onPaste={event => { event.preventDefault(); insert(document.createTextNode(event.clipboardData.getData('text/plain'))); }} onDrop={event=>event.preventDefault()}
      onKeyDown={event=>{if ((event.ctrlKey || event.metaKey) && ['b','i'].includes(event.key.toLowerCase())) {event.preventDefault();format(event.key.toLowerCase() as 'b'|'i');}}} />
    <div className="flex flex-wrap justify-between gap-2 px-4 pb-2 text-xs text-slate-500 dark:text-slate-400"><span>{copy.formatHint}</span><span>{text.length.toLocaleString()} / 20,000</span></div>
  </div>;
}
