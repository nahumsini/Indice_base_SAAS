import { cleanEditorHtml } from './mailFormat';
export function MailFormattedPreview({text,html,label}:{text:string;html?:string|null;label:string}){
 if(!html)return <p className="whitespace-pre-wrap break-words text-sm">{text}</p>;
 return <iframe title={label} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="min-h-56 w-full rounded-lg border bg-white" srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{font:16px/1.6 Arial,sans-serif;color:#172033;padding:12px;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#1d4ed8}table{max-width:100%}</style>${cleanEditorHtml(html)}`}/>;
}
