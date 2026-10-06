import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { createChatGptFileDownloader, publicIpv4, trustedFileUrl, fileDownloadHosts } from "../chatGptFiles.js";

const input={file:{download_url:"https://files.oaiusercontent.com/synthetic?sig=private",file_id:"file_synthetic",file_name:"evidence.pdf",mime_type:"application/pdf"},purpose:"task_evidence" as const,targetId:7,idempotencyKey:"synthetic-file-key"};
test("native ChatGPT file descriptor and runtime intake retain confirmation staging and hide download credentials",async()=>{
  const bytes=Buffer.from("%PDF-1.4\nSynthetic");const requests:unknown[]=[];
  const config=loadConfig({INDICE_BACKEND_URL:"http://127.0.0.1:8082",INDICE_MCP_TRANSPORT:"http"});
  const backend=new IndiceClient(config,(async(_url,init)=>{
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({stagedFileId:"11111111-1111-4111-8111-111111111111",purpose:"task_evidence",targetId:7,documentType:null,fileName:"evidence.pdf",mimeType:"application/pdf",sizeBytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),expiresAt:"2026-10-06T12:15:00Z"}));
  }) as typeof fetch,"idx_ai_synthetic");
  const downloader=createChatGptFileDownloader(["files.oaiusercontent.com"],undefined,{resolve:async()=>["8.8.8.8"],download:async(url,address,maximum)=>{
    assert.equal(address,"8.8.8.8");assert.equal(maximum,10485760);assert.equal(url.hostname,"files.oaiusercontent.com");return {bytes};
  }});
  const server=createIndiceMcpServer(backend,new Set(["stage_chatgpt_file"]),downloader);
  const client=new Client({name:"native-file-test",version:"1"});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
  try {
    const tool=(await client.listTools()).tools[0]!;
    assert.deepEqual(tool._meta?.["openai/fileParams"],["file"]);
    const schema=tool.inputSchema.properties!.file as {properties:object;required:string[]};
    assert.deepEqual(Object.keys(schema.properties).sort(),["download_url","file_id","file_name","mime_type"]);
    assert.deepEqual(schema.required.sort(),["download_url","file_id"]);
    const result=await client.callTool({name:"stage_chatgpt_file",arguments:input});assert.equal(result.isError,undefined);
    assert.ok(!JSON.stringify(result).includes("private"));assert.ok(!JSON.stringify(result).includes(bytes.toString("base64")));
    assert.deepEqual(requests,[{purpose:"task_evidence",targetId:7,fileName:"evidence.pdf",mimeType:"application/pdf",contentBase64:bytes.toString("base64"),idempotencyKey:"synthetic-file-key"}]);
  }finally{await client.close();await server.close();}
});
test("untrusted URLs, private DNS and oversized content fail before backend staging",async()=>{
  const hosts=["files.oaiusercontent.com"];
  for(const url of ["http://files.oaiusercontent.com/x","https://files.oaiusercontent.com:8443/x","https://user:pass@files.oaiusercontent.com/x","https://files.oaiusercontent.com/x#fragment","https://files.oaiusercontent.com.attacker.test/x","https://127.0.0.1/x"])assert.throws(()=>trustedFileUrl(url,hosts));
  for(const address of ["0.0.0.0","10.1.1.1","127.0.0.1","169.254.169.254","172.16.0.1","192.168.1.1","100.64.0.1","198.18.0.1","224.0.0.1","::1","::ffff:127.0.0.1"])assert.equal(publicIpv4(address),false);
  assert.throws(()=>fileDownloadHosts("*.oaiusercontent.com"));assert.deepEqual(fileDownloadHosts(),[]);
  let downloads=0;
  const privateDns=createChatGptFileDownloader(hosts,undefined,{resolve:async()=>["8.8.8.8","127.0.0.1"],download:async()=>{downloads++;return {bytes:Buffer.from("unused")};}});
  await assert.rejects(privateDns(input));assert.equal(downloads,0);
  const oversized=createChatGptFileDownloader(hosts,undefined,{resolve:async()=>["8.8.8.8"],download:async()=>({bytes:Buffer.alloc(2621441)})});
  await assert.rejects(oversized({...input,purpose:"asset_photo"}));
  const canceled=new AbortController();canceled.abort();
  await assert.rejects(createChatGptFileDownloader(hosts,canceled.signal)(input));
});
