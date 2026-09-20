import express from "express";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { getVideoDetails } from "./src/MediaDetails.js";
import { getVideoSources } from "./src/Resolver.js";
import { getSearchResults } from "./src/Search.js";
import { getXhamsterVideo } from "./src/xhamster/XhamsterGet.js";
import { searchXhamster } from "./src/xhamster/XhamsterSearch.js";

export const app = express();
app.use(express.static(new URL("./public", import.meta.url).pathname));

function normalizeEpornerVideo(details) {
  const sources = Object.values(details.sources?.mp4 || {}).map(s => ({ quality: s.labelShort, url: s.src }));
  return { success:true, data:{ title:details.title||"None", id:details.id||"None", image:details.default_thumb?.src||"None", duration:details.length_min||"None", views:details.views?.toString()||"None", rating:details.rate||"None", uploaded:details.added||"None", tags:details.keywords?details.keywords.split(",").map(t=>t.trim()).filter(Boolean):[], source:`https://www.eporner.com/embed/${details.id}/`, sources } };
}
function normalizeEpornerSearchResult(d) {
  return { success:true, data:(d.videos||[]).map(v=>({link:v.url||"None",id:v.id||"None",title:v.title||"None",image:v.default_thumb?.src||"None",duration:v.length_min||"None",views:v.views?.toString()||"None",video:v.embed||`https://www.eporner.com/embed/${v.id}/`})), page:d.page,total_pages:d.total_pages,total_count:d.total_count };
}
const PROVIDER_TIMEOUT_MS=Number(process.env.PROVIDER_TIMEOUT_MS)||12000;
const metrics={eporner:{ok:0,fail:0,lastMs:null,lastOk:null,lastError:null},xhamster:{ok:0,fail:0,lastMs:null,lastOk:null,lastError:null}};
function timeout(promise,ms=PROVIDER_TIMEOUT_MS){let timer;const guard=new Promise((_,reject)=>timer=setTimeout(()=>{const e=new Error("provider_timeout");e.code="PROVIDER_TIMEOUT";reject(e)},ms));return Promise.race([promise,guard]).finally(()=>clearTimeout(timer))}
async function observed(provider,work){const t=Date.now();try{const value=await timeout(work());const m=metrics[provider];m.ok++;m.lastMs=Date.now()-t;m.lastOk=new Date().toISOString();m.lastError=null;return value}catch(e){const m=metrics[provider];m.fail++;m.lastMs=Date.now()-t;m.lastError=e.code||e.message||"UPSTREAM_ERROR";throw e}}
function providerError(res,e){const code=e?.code==="PROVIDER_TIMEOUT"?"PROVIDER_TIMEOUT":"UPSTREAM_ERROR";return res.status(code==="PROVIDER_TIMEOUT"?504:502).json({success:false,error:code})}
app.get("/health", (_req,res)=>res.json({status:"ok",service:"porn-api-js",uptime_seconds:Math.round(process.uptime())}));
app.get("/ready", (_req,res)=>res.json({status:"ready",service:"porn-api-js",providers:Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,{last_ms:v.lastMs,last_ok:v.lastOk,last_error:v.lastError,successes:v.ok,failures:v.fail}]))}));
app.get("/api/diagnostics", (_req,res)=>res.json({success:true,node:process.version,uptime_seconds:Math.round(process.uptime()),provider_timeout_ms:PROVIDER_TIMEOUT_MS,providers:metrics}));
app.get("/swagger.json", (_req,res)=>{res.type("json").send(readFileSync(new URL("./swagger.json", import.meta.url)));});
app.get("/api", (_req,res)=>res.json({intro:"Unofficial multi-provider API",providers:{eporner:{search:"/api/eporner/search/:query",details:"/api/eporner/details/:id"},xhamster:{search:"/api/xhamster/search/:query",details:"/api/xhamster/details/:id"}}}));
app.get("/api/eporner/details/:id", async(req,res)=>{
  let details,sources;try{[details,sources]=await observed("eporner",()=>Promise.all([getVideoDetails(req.params.id,req.query.thumbsize||"medium"),getVideoSources(req.params.id)]))}catch(e){return providerError(res,e)}
  if(!details||!sources) return res.status(502).json({success:false,error:"provider_unavailable"});
  details.json.details.sources=sources.sources; return res.json(normalizeEpornerVideo(details.json.details));
});
app.get("/api/eporner/search/:query", async(req,res)=>{
  let r;try{r=await observed("eporner",()=>getSearchResults(req.params.query,req.query.per_page||"30",req.query.page||"1",req.query.thumbsize||"medium",req.query.order||"latest",req.query.gay||"0",req.query.lq||"1"))}catch(e){return providerError(res,e)}
  if(!r) return res.status(502).json({success:false,error:"provider_unavailable"}); return res.json(normalizeEpornerSearchResult(r.json.details));
});
app.get("/api/xhamster/details/:id",async(req,res)=>{let r;try{r=await observed("xhamster",()=>getXhamsterVideo(req.params.id))}catch(e){return providerError(res,e)}return r?res.json(r):res.status(502).json({success:false,error:"UPSTREAM_EMPTY"});});
app.get("/api/xhamster/search/:query",async(req,res)=>{let r;try{r=await observed("xhamster",()=>searchXhamster(req.params.query,req.query.page||"1"))}catch(e){return providerError(res,e)}return r?res.json(r):res.status(502).json({success:false,error:"UPSTREAM_EMPTY"});});
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({success:false,error:"internal_error"});});

export function start(port=Number(process.env.PORT)||3000){ return app.listen(port,()=>console.log(`API listening on http://localhost:${port}`)); }
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) start();
