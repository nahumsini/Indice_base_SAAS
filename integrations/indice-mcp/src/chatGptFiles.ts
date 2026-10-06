import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { z } from "zod";
import { filePurposeSchema, fileMimeSchema, stageFileRequestSchema, type StageFileRequest } from "./fileContracts.js";

// The four host-supplied properties are required by the ChatGPT file-input contract.
export const chatGptFileRequestSchema = z.object({
  file: z.object({ download_url: z.string().min(1).max(8192), file_id: z.string().min(1).max(256),
    mime_type: z.string().optional(), file_name: z.string().optional() }).strict(),
  purpose: filePurposeSchema, targetId: z.number().int().positive(),
  documentType: z.enum(["proof_of_address", "resume", "profile_photo"]).optional(),
  fileName: z.string().min(1).max(180).optional(), mimeType: fileMimeSchema.optional(),
  idempotencyKey: z.string().min(8).max(128)
}).strict();
export type ChatGptFileRequest = z.infer<typeof chatGptFileRequestSchema>;
export type ChatGptFileDownloader = (input: ChatGptFileRequest) => Promise<StageFileRequest>;

export function fileDownloadHosts(value = ""): string[] {
  if (!value.trim()) return [];
  const hosts = value.split(",").map(h => h.trim().toLowerCase());
  if (hosts.some(h => !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(h) || isIP(h)))
    throw Error("INDICE_CHATGPT_FILE_HOSTS requires exact DNS hostnames without URLs or wildcards.");
  return [...new Set(hosts)];
}
export function trustedFileUrl(value: string, hosts: readonly string[]): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw Error("Invalid ChatGPT file URL."); }
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password || url.hash ||
      isIP(url.hostname) || !hosts.includes(url.hostname.toLowerCase()))
    throw Error("ChatGPT file host is not configured for intake.");
  return url;
}
export function publicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a,b,c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a! >= 224 ||
    (a === 100 && b! >= 64 && b! <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export interface FileDownloadDependencies {
  resolve?: (host: string) => Promise<readonly string[]>;
  download?: (url: URL, address: string, maximum: number, signal: AbortSignal) => Promise<{bytes: Buffer; mimeType?: string}>;
}
export function createChatGptFileDownloader(hosts: readonly string[], cancellation?: AbortSignal,
  dependencies: FileDownloadDependencies = {}): ChatGptFileDownloader {
  const resolve = dependencies.resolve ?? (async host => (await lookup(host,{family:4,all:true})).map(r => r.address));
  const download = dependencies.download ?? downloadPinned;
  return async raw => {
    const input = chatGptFileRequestSchema.parse(raw);
    const url = trustedFileUrl(input.file.download_url, hosts);
    const signal = cancellation ? AbortSignal.any([cancellation,AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
    try {
      signal.throwIfAborted();
      // Validate every returned address and pin the selected address in the TLS connection.
      const addresses = await abortable(resolve(url.hostname),signal);
      signal.throwIfAborted();
      if (!addresses.length || addresses.some(a => !publicIpv4(a))) throw Error("File host resolved to a non-public address.");
      const maximum = input.purpose === "asset_photo" ? 2621440 : input.purpose === "employee_document" ? 5242880 : 10485760;
      const response = await download(url, addresses[0]!, maximum, signal);
      if (!response.bytes.length || response.bytes.length > maximum) throw Error("File exceeds its domain limit.");
      return stageFileRequestSchema.parse({purpose:input.purpose,targetId:input.targetId,documentType:input.documentType,
        fileName:input.fileName ?? input.file.file_name ?? "attachment",
        mimeType:input.mimeType ?? input.file.mime_type ?? response.mimeType,
        contentBase64:response.bytes.toString("base64"),idempotencyKey:input.idempotencyKey});
    } catch { throw Error("Could not prepare the ChatGPT attachment. Verify its type, size and current download availability."); }
  };
}
function abortable<T>(pending:Promise<T>,signal:AbortSignal):Promise<T> {
  return new Promise((resolve,reject)=>{
    const canceled=()=>reject(Error("File operation canceled."));
    signal.addEventListener("abort",canceled,{once:true});
    pending.then(resolve,reject).finally(()=>signal.removeEventListener("abort",canceled));
    if(signal.aborted)canceled();
  });
}
function downloadPinned(url: URL, address: string, maximum: number, signal: AbortSignal): Promise<{bytes:Buffer;mimeType?:string}> {
  return new Promise((resolve,reject) => {
    const operation = request(url,{method:"GET",agent:false,family:4,servername:url.hostname,signal,
      // No Indice authorization, cookies, redirect following or user-controlled headers.
      lookup:(_host,_options,callback)=>callback(null,address,4),headers:{Accept:"application/octet-stream"}}, response => {
      if(response.statusCode !== 200 || (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) {
        response.destroy(); reject(Error("File download rejected.")); return;
      }
      const length=response.headers["content-length"];
      if(length && (!/^\d+$/.test(length) || Number(length)>maximum)) {response.destroy();reject(Error("File too large."));return;}
      const chunks:Buffer[]=[];let size=0;
      response.on("data",(part:Buffer)=>{size+=part.length;if(size>maximum){response.destroy(Error("File too large."));return;}chunks.push(part);});
      response.once("error",reject);
      response.once("end",()=>resolve({bytes:Buffer.concat(chunks),mimeType:response.headers["content-type"]?.split(";")[0]?.trim()}));
    });
    operation.once("error",reject);operation.end();
  });
}
