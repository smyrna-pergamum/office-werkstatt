/**
 * AI engines return a JSON plan via a normalized interface.
 * The caller supplies localGenerate implemented by an embedded Rust/llama.cpp bridge.
 */
export class LocalProvider {
  constructor(localGenerate){if(typeof localGenerate!=='function')throw Error('Missing llama.cpp bridge'); this.generate=localGenerate;}
  async plan(request,context){return parsePlan(await this.generate({request,context}));}
}
export class OpenAIProvider {
  constructor({apiKey,model,fetchImpl=fetch}){
    if(!apiKey)throw Error('API key required');
    this.key=apiKey;this.model=model;this.fetch=fetchImpl;
  }
  async plan(request,context){
    // Calling this provider is an explicit user opt-in. No automatic fallback.
    const res=await this.fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.key}`},
      body:JSON.stringify({model:this.model,messages:[
        {role:'system',content:'Produce only JSON: {"description":"...","actions":[{"module":"slide","tool":"add_slide","args":{"title":"..."}}]}. Use allowed Office tools. Never include code fences.'},
        {role:'user',content:JSON.stringify({request,context})}],response_format:{type:'json_object'}})
    });
    if(!res.ok)throw new Error(`OpenAI HTTP ${res.status}`);
    const json=await res.json();return parsePlan(json.choices?.[0]?.message?.content);
  }
}
export function parsePlan(response) {
  const text=typeof response==='string'?response:response?.text;
  if(typeof text!=='string')throw Error('Model returned no text');
  return JSON.parse(text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
}
