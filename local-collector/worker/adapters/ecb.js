import {ValidationError,sha256,stableJSON} from '../common.js';
import {intelJSON,intelArrayEnvelope,intelRSSEnvelope,intelRSSProject,intelText,intelChild,intelTimestamp,intelEpoch,intelGeometryProjection} from '../adapter-common.js';
/** Deterministic ecb source script. Fixed registered request; projected fields only. */
export const ADAPTER_ECB=Object.freeze({id:'ecb',version:'bounded-projection-v1',empty_policy:'recognized schema with coherent upstream counts; no false-zero projection',readEnvelope(raw){return intelRSSEnvelope(raw,'ecb')},project(n,source,base){return intelRSSProject(n,source,base)}});
