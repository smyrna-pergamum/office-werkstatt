import {AgentError,MODULES} from './core.mjs';
const clone=x=>structuredClone(x);
const nextId = (arr,prefix)=>`${prefix}-${arr.length+1}-${Math.floor(Math.random()*1e6)}`;
export class MockOfficeAdapter {
  constructor() { this.documents=Object.fromEntries(MODULES.map(m=>[m,{items:[]}])); this.changeCount=0; }
  async snapshot(){return clone(this.documents);}
  async restore(s){this.documents=clone(s);}
  async onChanged(){this.changeCount++;}
  async execute({module,tool,args}) {
    const doc=this.documents[module];
    if(!doc) throw new AgentError('UNKNOWN_MODULE',module);
    if(tool==='read_document')return clone(doc);
    const add=(kind,data)=>{const item={id:nextId(doc.items,kind),kind,...data};doc.items.push(item);return clone(item);};
    switch(tool){
      case 'add_slide':return add('slide',{title:args.title,elements:[]});
      case 'add_text': case 'add_shape':{
        const slide=doc.items.find(x=>x.id===args.slideId && x.kind==='slide');
        if(!slide)throw new Error(`Missing slide: ${args.slideId}`);
        const elem={id:nextId(slide.elements,'element'),kind:tool==='add_text'?'text':'shape',
          ...(tool==='add_text'?{text:args.text}:{shape:args.shape})};
        slide.elements.push(elem);return clone(elem);
      }
      case 'set_text': case 'delete_element':{
        for(const slide of doc.items){const idx=slide.elements?.findIndex(x=>x.id===args.elementId)??-1;
          if(idx>=0) {
            if(tool==='delete_element') return slide.elements.splice(idx,1)[0];
            slide.elements[idx].text=args.text;return clone(slide.elements[idx]);
          }}
        throw new Error(`Missing element: ${args.elementId}`);
      }
      case 'add_sheet': return add('sheet',{name:args.name,cells:{}});
      case 'set_cell':{
        const sheet=doc.items.find(x=>x.kind==='sheet'&&x.name===args.sheet);
        if(!sheet)throw new Error(`Missing sheet: ${args.sheet}`);
        sheet.cells[args.address]=args.value;return {address:args.address,value:args.value};
      }
      case 'append_paragraph':return add('paragraph',{text:args.text});
      case 'add_note':return add('note',{text:args.text});
      case 'add_node':return add('node',{label:args.label});
      case 'add_pdf_annotation':return add('annotation',{text:args.text,page:args.page??1});
      case 'add_design_text':return add('design_text',{text:args.text});
      case 'add_form_question':return add('question',{label:args.label,type:args.type??'text'});
      default:throw new Error(`Not implemented: ${tool}`);
    }
  }
}
