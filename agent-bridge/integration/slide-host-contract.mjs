/**
 * This is the contract to implement INSIDE Office Werkstatt's actual Slide editor.
 * It intentionally does not invent the proprietary Pro editor API names.
 * The integration author must map the functions below to real editor operations.
 */
import { AgentError } from '../src/core.mjs';

export function makeSlideEditorHost({documentId,getRevision,exportDocument,importDocument,
  createSlide,addText,setText,deleteElement,notifyDocumentChanged}) {
  const required={documentId,getRevision,exportDocument,importDocument,
    createSlide,addText,setText,deleteElement};
  for(const [name,fn] of Object.entries(required))
    if(typeof fn!=='function')throw new TypeError(`Missing Slide host function: ${name}`);
  return {
    async readIdentity(){return {documentId:await documentId(),revision:await getRevision()};},
    async snapshot(){return exportDocument();},
    async restore(snapshot){return importDocument(snapshot);},
    async onChanged(){await notifyDocumentChanged?.();},
    async execute(action){
      if(action.module!=='slide')throw new AgentError('UNSUPPORTED_MODULE','Only Slide connected');
      switch(action.tool){
        case 'read_document':return exportDocument();
        case 'add_slide':return createSlide(action.args);
        case 'add_text':return addText(action.args);
        case 'set_text':return setText(action.args);
        case 'delete_element':return deleteElement(action.args);
        default:throw new AgentError('UNSUPPORTED_TOOL',action.tool);
      }
    }
  };
}
