import express from "express";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { getVideoDetails } from "./src/MediaDetails.js";
import { getVideoSources } from "./src/Resolver.js";
import { getSearchResults } from "./src/Search.js";
import { getXhamsterVideo } from "./src/xhamster/XhamsterGet.js";
import { searchXhamster } from "./src/xhamster/XhamsterSearch.js";

export const app = express();

function normalizeEpornerVideo(details) {
  const sources = Object.values(details.sources?.mp4 || {}).map(s => ({ quality: s.labelShort, url: s.src }));
  return { success:true, data:{ title:details.title||"None", id:details.id||"None", image:details.default_thumb?.src||"None", duration:details.length_min||"None", views:details.views?.toString()||"None", rating:details.rate||"None", uploaded:details.added||"None", tags:details.keywords?details.keywords.split(",").map(t=>t.trim()).filter(Boolean):[], source:`https://www.eporner.com/embed/${details.id}/`, sources } };
}
function normalizeEpornerSearchResult(d) {
  return { success:true, data:(d.videos||[]).map(v=>({link:v.url||"None",id:v.id||"None",title:v.title||"None",image:v.default_thumb?.src||"None",duration:v.length_min||"None",views:v.views?.toString()||"None",video:v.embed||`https://www.eporner.com/embed/${v.id}/`})), page:d.page,total_pages:d.total_pages,total_count:d.total_count };
}
app.get("/health", (_req,res)=>res.json({status:"ok",service:"porn-api-js"}));
app.get("/swagger.json", (_req,res)=>{res.type("json").send(readFileSync(new URL("./swagger.json", import.meta.url)));});
app.get("/", (_req,res)=>res.json({intro:"Unofficial multi-provider API",providers:{eporner:{search:"/api/eporner/search/:query",details:"/api/eporner/details/:id"},xhamster:{search:"/api/xhamster/search/:query",details:"/api/xhamster/details/:id"}}}));
app.get("/api/eporner/details/:id", async(req,res)=>{
  const [details,sources]=await Promise.all([getVideoDetails(req.params.id,req.query.thumbsize||"medium"),getVideoSources(req.params.id)]);
  if(!details||!sources) return res.status(502).json({success:false,error:"provider_unavailable"});
  details.json.details.sources=sources.sources; return res.json(normalizeEpornerVideo(details.json.details));
});
app.get("/api/eporner/search/:query", async(req,res)=>{
  const r=await getSearchResults(req.params.query,req.query.per_page||"30",req.query.page||"1",req.query.thumbsize||"medium",req.query.order||"latest",req.query.gay||"0",req.query.lq||"1");
  if(!r) return res.status(502).json({success:false,error:"provider_unavailable"}); return res.json(normalizeEpornerSearchResult(r.json.details));
});
app.get("/api/xhamster/details/:id",async(req,res)=>{const r=await getXhamsterVideo(req.params.id);return r?res.json(r):res.status(502).json({success:false,error:"provider_unavailable"});});
app.get("/api/xhamster/search/:query",async(req,res)=>{const r=await searchXhamster(req.params.query,req.query.page||"1");return r?res.json(r):res.status(502).json({success:false,error:"provider_unavailable"});});
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({success:false,error:"internal_error"});});

export function start(port=Number(process.env.PORT)||3000){ return app.listen(port,()=>console.log(`API listening on http://localhost:${port}`)); }
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) start();
