import { MockOfficeAdapter } from './mock-office.mjs';
/** Test-only model: unlike production editor, this is NOT a real .pptx editor. */
export class VersionedMockOffice extends MockOfficeAdapter {
  constructor(){super();this.documentId='demo-presentation';this.revision=0;}
  readIdentity(){return {documentId:this.documentId,revision:this.revision};}
  async execute(action){
    const result=await super.execute(action);
    if(action.tool!=='read_document')this.revision++;
    return result;
  }
  async snapshot(){return {documents:await super.snapshot(),revision:this.revision};}
  async restore(snapshot){await super.restore(snapshot.documents);this.revision++;}
  manualEdit(){this.revision++;}
}
