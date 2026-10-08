import {ValidationError,sha256,stableJSON} from '../common.js';
import {intelJSON,intelArrayEnvelope,intelRSSEnvelope,intelRSSProject,intelText,intelChild,intelTimestamp,intelEpoch,intelGeometryProjection} from '../adapter-common.js';
/** Deterministic un_zh source script. Fixed registered request; projected fields only. */
export const ADAPTER_UN_ZH=Object.freeze({id:'un_zh',version:'bounded-projection-v1',empty_policy:'recognized schema with coherent upstream counts; no false-zero projection',readEnvelope(raw){const e=intelRSSEnvelope(raw,'un_zh');if(e.language&&!['zh','zh-cn','zh-hans'].includes(e.language.toLowerCase()))throw new ValidationError('UN Chinese feed declared language mismatch');return e},project(n,source,base){return intelRSSProject(n,source,base)}});
