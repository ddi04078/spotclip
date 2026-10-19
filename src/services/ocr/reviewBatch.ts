import type { AnalysisItem, AnalysisReport } from '../../domain/types.ts';
import { placeEvidence } from '../resolution/placeEvidence.ts';
export function canReviewInBatch(item: AnalysisItem): boolean {
  if (['saved','duplicate'].includes(item.decision)) return false;
  if (item.matches.some(p=>p.verification==='official')) return !!item.selected && item.confirmed;
  return !!item.candidate.name.trim() && item.candidate.name.length<=150 && (item.candidate.addressHint || '').length<=300;
}
/** Explicit user confirmation only; OCR guesses never become officially verified. */
export function confirmOcrBatch(report: AnalysisReport): AnalysisReport {
  if(report.mode!=='ocr') return report;
  return {...report,items:report.items.map(item=>{
    if(!canReviewInBatch(item))return item;
    if(item.selected?.verification==='official')return item;
    return {...item,selected:{name:item.candidate.name.trim(),address:(item.candidate.addressHint || '').trim(),category:placeEvidence(item.candidate).category||'기타',mapProvider:'none',verification:'unverified',confidence:Math.min(.65,item.candidate.confidence)},decision:'ready',confirmed:true};
  })};
}
