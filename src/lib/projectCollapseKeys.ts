import type { PoControl, ProjectHierarchy } from "@/types";



export function batchKey(batch: ProjectHierarchy["batches"][number], batchIndex: number) {

  return `batch-${batch.batch_instance_id ?? batchIndex}`;

}



export function moKey(

  mo: ProjectHierarchy["batches"][number]["mo_controls"][number],

  batchIndex: number,

  moIndex: number,

) {

  return `mo-${mo.mo_instance_id ?? `${batchIndex}-${moIndex}`}`;

}



export function poKey(po: PoControl, batchIndex: number, moIndex: number, poIndex: number) {

  return `po-${po.po_instance_id ?? `${batchIndex}-${moIndex}-${poIndex}`}`;

}



export function cnfKey(poKeyValue: string, cnfIndex: number) {

  return `cnf-${poKeyValue}-${cnfIndex}`;

}



export interface CollapseOccurrenceRef {

  batchIndex: number;

  moIndex?: number;

  poIndex?: number;

  cnfIndex?: number;

}



export function buildCollapseKeysForOccurrence(

  project: ProjectHierarchy,

  occurrence: CollapseOccurrenceRef,

): string[] {

  const keys: string[] = [];

  const batch = project.batches[occurrence.batchIndex];

  if (!batch) return keys;



  keys.push(batchKey(batch, occurrence.batchIndex));



  if (occurrence.moIndex == null) return keys;

  const mo = batch.mo_controls[occurrence.moIndex];

  if (!mo) return keys;



  keys.push(moKey(mo, occurrence.batchIndex, occurrence.moIndex));



  if (occurrence.poIndex == null) return keys;

  const po = mo.po_controls[occurrence.poIndex];

  if (!po) return keys;



  const poKeyValue = poKey(po, occurrence.batchIndex, occurrence.moIndex, occurrence.poIndex);

  keys.push(poKeyValue);



  if (occurrence.cnfIndex != null) {

    keys.push(cnfKey(poKeyValue, occurrence.cnfIndex));

  }



  return keys;

}


