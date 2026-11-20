/** Opt-in SearXNG search; NEVER automatically contacts the network. */
export class WebSearch {
  constructor({enabled=false, baseUrl='', fetchImpl=globalThis.fetch, allowedOrigins=[]}={}) {
    this.enabled=enabled;
    this.baseUrl=baseUrl;
    this.fetch=fetchImpl;
    this.allowedOrigins=new Set(allowedOrigins);
  }
  async search(query,{limit=5,signal}={}) {
    if(!this.enabled)throw new Error('WEB_DISABLED: user must explicitly enable web search');
    if(typeof query!=='string' || !query.trim() || query.length>300)throw new Error('Invalid search query');
    if(!Number.isInteger(limit) || limit<1 || limit>10)throw new Error('Invalid result limit');
    const url=new URL(this.baseUrl);
    if(!['https:','http:'].includes(url.protocol))throw new Error('Unsupported search protocol');
    if(!this.allowedOrigins.has(url.origin))throw new Error('Search origin not explicitly allowlisted');
    if(url.protocol==='http:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname))
      throw new Error('Remote search requires HTTPS');
    url.pathname=url.pathname.replace(/\/$/,'')+'/search';
    url.search=new URLSearchParams({q:query,format:'json'}).toString();
    const response=await this.fetch(url,{method:'GET',signal,headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`Search HTTP ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data.results))throw new Error('Invalid search response');
    return data.results.slice(0,limit).map(item=>({
      title:String(item.title??'').slice(0,200),
      url:validateResultUrl(item.url),
      snippet:String(item.content??'').slice(0,1000),
      untrusted:true,
    })).filter(item=>item.url);
  }
}
function validateResultUrl(value) {
  try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)?u.href:null; }
  catch {return null;}
}
