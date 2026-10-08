import {ValidationError,sha256,stableJSON} from '../common.js';
import {intelJSON,intelArrayEnvelope,intelRSSEnvelope,intelRSSProject,intelText,intelChild,intelTimestamp,intelEpoch,intelGeometryProjection} from '../adapter-common.js';
/** Deterministic bis_speeches source script. Fixed registered request; projected fields only. */
export const ADAPTER_BIS_SPEECHES=Object.freeze({id:'bis_speeches',version:'bounded-projection-v2-geometry-rdf',empty_policy:'recognized schema with coherent upstream counts; no false-zero projection',readEnvelope(raw){return intelRSSEnvelope(raw,'bis_speeches')},project(n,source,base){return intelRSSProject(n,source,base)}});
