import pathlib,json,copy,datetime,email.utils,hashlib,html,math,re
P=pathlib.Path(__file__).parent;R=P.parent;CAT=json.loads((R/'source-registry.v0.2.json').read_text());S={s['id']:s for s in CAT['sources']};cases=[];baselines={}
FROZEN='2026-10-08T00:00:00.000Z'
def iso(v):
 if isinstance(v,(int,float)):d=datetime.datetime.fromtimestamp(v/1000,datetime.timezone.utc)
 else:
  try:d=email.utils.parsedate_to_datetime(v)
  except Exception:d=datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
 return d.astimezone(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def compact(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'),sort_keys=True)
def x(t):return html.escape(str(t),quote=True)
def rss(id,items,channel_extra='',root=True):
 head=f'<title>{x(S[id]["name"])}</title><link>{x(S[id]["official_url"])}</link><description>Reconstructed test metadata envelope</description>'+channel_extra
 body=''.join('<item>'+''.join(f'<{k}>{x(v)}</{k}>' for k,v in a.items() if v is not None)+'</item>' for a in items)
 return ('<rss version="2.0"><channel>'+head+body+'</channel></rss>') if root else '<rss version="2.0">'+body+'</rss>'
def gdacs(items):
 rows=[]
 for a in items:
  body=''.join(f'<{k}>{x(a.get(k))}</{k}>' for k in ['title','link','pubDate','guid'] if a.get(k) is not None)
  for k in ['eventtype','eventid','episodeid','alertlevel','country','iso3','fromdate','todate']:
   if a.get(k) is not None:body+=f'<gdacs:{k}>{x(a[k])}</gdacs:{k}>'
  if a.get('point') is not None:body+='<georss:point>'+x(a['point'])+'</georss:point>'
  for k in ['severity','population']:
   if a.get(k) is not None:body+='<gdacs:'+k+''.join(' '+n+'="'+x(v)+'"' for n,v in a.get(k+'_attributes',{}).items())+'>'+x(a[k])+'</gdacs:'+k+'>'
  rows.append('<item>'+body+'</item>')
 return '<rss version="2.0" xmlns:gdacs="http://www.gdacs.org" xmlns:georss="http://www.georss.org/georss"><channel><title>GDACS test envelope</title><link>https://www.gdacs.org/</link>'+''.join(rows)+'</channel></rss>'
def rdf(id,items,refcount=None,wrong_container=False):
 refs=items if refcount is None else [{'link':'https://example.org/TEST_missing_'+str(i)} for i in range(refcount)]
 channel='<channel rdf:about="'+x(S[id]['official_url'])+'"><title>'+x(S[id]['name'])+'</title><link>'+x(S[id]['official_url'])+'</link><items><rdf:Seq>'+''.join('<rdf:li rdf:resource="'+x(a['link'])+'"/>' for a in refs)+'</rdf:Seq></items></channel>'
 body=''.join('<item rdf:about="'+x(a['link'])+'"><title>'+x(a['title'])+'</title><link>'+x(a['link'])+'</link><dc:date>'+x(a['date'])+'</dc:date></item>' for a in items)
 if wrong_container:body='<entries>'+body+'</entries>'
 return '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">'+channel+body+'</rdf:RDF>'
def add(id,name,payload,mode,expected=None,origin='synthetic mutation of saved public metadata'):
 xml=isinstance(payload,str);fn=f'fixtures/{id}--{name}.'+('xml' if xml else 'json');b=payload.encode() if xml else json.dumps(payload,ensure_ascii=False,indent=2).encode();(P/fn).write_bytes(b);case={'case_id':id+'--'+name,'source_id':id,'payload_file':fn,'payload_sha256':hashlib.sha256(b).hexdigest(),'mode':mode,'expected':expected or {},'fixture_provenance':origin,'no_live_collection_seed':True};cases.append(case)
def subset(id,row):
 s=S[id];d={'source_id':id,'source_country':s.get('source_country'),'source_language':s.get('source_language'),'event_country':None,'location':None,'location_basis':'unknown','event_time':None,'published_at':None,'source_updated_at':None,'short_summary':None,'content_depth':'headline_metadata','source_license':s['license'],'evidence_url':s['official_url']}
 if id=='usgs':
  p=row['properties'];d.update(upstream_id=row['id'],title=p['title'],url=p['url'],event_time=iso(p['time']),source_updated_at=iso(p['updated']),location={'type':'Point','coordinates':row['geometry']['coordinates'],'place':p.get('place'),'coordinate_order':'longitude,latitude,depth_km'},location_basis='source_provided',content_depth='structured_facts',facts={k:p.get(k) for k in ['mag','magType','alert','status','tsunami','sig','type']})
 elif id=='eonet':
  g=row.get('geometry',[]);latest=g[-1] if g else None;d.update(upstream_id=row['id'],title=row['title'],url=row['link'],event_time=iso(g[0]['date']) if g else None,location={'type':latest['type'],'coordinates':latest['coordinates'],'date':latest['date']} if latest else None,location_basis='source_provided' if latest else 'unknown',content_depth='structured_facts',facts={'closed':row.get('closed'),'geometry_count':len(g)})
 elif id=='gdacs':
  xy=[float(n) for n in row['point'].split()];d.update(upstream_id=row['guid'],title=row['title'],url=row['link'],published_at=iso(row['pubDate']),event_time=iso(row['fromdate']),event_country=row.get('iso3'),location={'latitude':xy[0],'longitude':xy[1]},location_basis='source_provided',content_depth='structured_facts',facts={k:row.get(k) for k in ['eventtype','eventid','episodeid','alertlevel','iso3']})
 elif id=='my_fuel_latest':d.update(upstream_id='fuelprice:'+row['date']+':'+row['series_type'],title='Malaysia fuel prices '+row['date']+' ('+row['series_type']+')',url=s['official_url'],event_country='MY',content_depth='structured_facts',facts={'date':row['date'],'series_type':row['series_type'],'ron95':row.get('ron95')})
 elif id=='my_warning':
  key={"issued":row['warning_issue']['issued'],"heading_en":row['heading_en'],"valid_from":row['valid_from']};d.update(upstream_id=hashlib.sha256(compact(key).encode()).hexdigest(),title=row['warning_issue'].get('title_en') or row['warning_issue'].get('title_bm') or row.get('heading_en') or row.get('heading_bm'),url=s['official_url'],facts={'warning_issue':row['warning_issue'],'valid_from':row['valid_from'],'valid_to':row['valid_to']})
 elif id=='nasa_metadata':d.update(upstream_id=str(row['id']),title=html.unescape(re.sub('<[^>]*>','',row['title']['rendered'])),url=row['link'],published_at=iso(row['date_gmt']+'Z'),source_updated_at=iso(row['modified_gmt']+'Z'))
 else:
  rawdate=row.get('pubDate',row.get('date'));d.update(upstream_id=row.get('guid') or row.get('id') or 'derived:'+row['link']+'|'+(rawdate or 'publication_unknown'),title=row['title'],url=row['link'],published_at=iso(rawdate) if rawdate else None)
 return d
for id in S:
 raw=json.loads((R/(id+'-safe-sample.json')).read_text())['items'][:2];baselines[id]=copy.deepcopy(raw)
 if id=='usgs':payload={'type':'FeatureCollection','metadata':{'count':len(raw),'status':200},'features':raw};raw.sort(key=lambda a:a['properties']['time'],reverse=True)
 elif id=='eonet':payload={'events':raw};raw.sort(key=lambda a:a['geometry'][0]['date'],reverse=True)
 elif id=='gdacs':payload=gdacs(raw);raw.sort(key=lambda a:iso(a['pubDate']),reverse=True)
 elif id.startswith('bis_'):payload=rdf(id,raw);raw.sort(key=lambda a:a['date'],reverse=True)
 elif id in ('un_zh','ecb'):payload=rss(id,raw,'<language>zh-hans</language>' if id=='un_zh' else '<language>en</language>');raw.sort(key=lambda a:iso(a['pubDate']),reverse=True)
 else:payload=raw
 add(id,'saved_metadata_positive',payload,'accept',{'result':{'upstream_count':2,'truncated':False},'items_by_id':{subset(id,a)['upstream_id']:subset(id,a) for a in raw}},'Reconstructed minimal transport envelope around two retained safe upstream metadata/factual records. Not a raw response body; never product data.')
 # Valid source-specific empty envelopes, retaining metadata and recognized containers.
 if id=='usgs':empty={'type':'FeatureCollection','metadata':{'count':0,'status':200},'features':[]}
 elif id=='eonet':empty={'events':[]}
 elif id.startswith('bis_'):empty=rdf(id,[])
 elif id in ('gdacs','un_zh','ecb'):empty=gdacs([]) if id=='gdacs' else rss(id,[],'<language>zh-hans</language>' if id=='un_zh' else '')
 else:empty=[]
 add(id,'coherent_empty',empty,'accept',{'result':{'upstream_count':0},'item_count':0,'empty_semantics':'A valid known container can be empty; this alone is not global coverage or source freshness proof.'})
 # Error object and safe-root/container drift must never become successful zero.
 add(id,'provider_error_or_wrong_root',{'error':'TEST_SYNTHETIC_UPSTREAM_ERROR'} if id not in ('gdacs','un_zh','ecb','bis_press','bis_speeches') else '<html><body>TEST_SYNTHETIC_ERROR_PAGE</body></html>','reject')
 if id in ('gdacs','un_zh','ecb'):
  add(id,'rss_missing_channel',rss(id,[],root=False),'reject')
  add(id,'nonzero_upstream_count_zero_items',rss(id,[], '<totalResults>2</totalResults>'),'reject')
 elif id.startswith('bis_'):
  add(id,'rdf_nonzero_references_zero_items',rdf(id,[],refcount=1),'reject')
  add(id,'rdf_items_wrong_container',rdf(id,baselines[id],wrong_container=True),'reject')
# USGS required fields and count/location coherence.
a=copy.deepcopy(baselines['usgs'][0]);a['geometry']['coordinates']=[];add('usgs','empty_coordinates',{'type':'FeatureCollection','metadata':{'count':1},'features':[a]},'reject')
a=copy.deepcopy(baselines['usgs'][0]);a['geometry']['coordinates']=[181,91,10];add('usgs','out_of_range_coordinates',{'type':'FeatureCollection','metadata':{'count':1},'features':[a]},'reject')
a=copy.deepcopy(baselines['usgs'][0]);del a['properties']['time'];add('usgs','missing_event_epoch',{'type':'FeatureCollection','metadata':{'count':1},'features':[a]},'reject')
a=copy.deepcopy(baselines['usgs'][0]);a['properties']['mag']='4.9';add('usgs','numeric_string_magnitude',{'type':'FeatureCollection','metadata':{'count':1},'features':[a]},'reject')
add('usgs','count_mismatch',{'type':'FeatureCollection','metadata':{'count':2},'features':baselines['usgs'][:1]},'reject')
# EONET geometry bound, nullable absent geometry, and malformed supplied facts.
a=copy.deepcopy(baselines['eonet'][0]);a['geometry']=[];add('eonet','geometry_unknown_preserved',{'events':[a]},'accept',{'items':[{'event_time':None,'location':None,'location_basis':'unknown','event_country':None,'published_at':None}]})
a=copy.deepcopy(baselines['eonet'][0]);a['geometry'][0]['coordinates']=[181,91];add('eonet','out_of_range_coordinates',{'events':[a]},'reject')
a=copy.deepcopy(baselines['eonet'][0]);a['geometry'][0]['date']='2026-02-30T19:00:00Z';add('eonet','invalid_calendar_datetime',{'events':[a]},'reject')
a=copy.deepcopy(baselines['eonet'][0]);del a['id'];add('eonet','missing_event_id',{'events':[a]},'reject')
a={'id':'EONET_999999991','title':'TEST synthetic bounded polygon','link':'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_999999991','closed':None,'categories':[{'id':'floods','title':'Floods'}],'sources':[],'geometry':[{'type':'Polygon','date':'2026-10-07T00:00:00Z','coordinates':[[[10+math.cos(i*2*math.pi/20)/100,20+math.sin(i*2*math.pi/20)/100] for i in range(20)]+[[10.01,20.0]]]}]};add('eonet','bounded_polygon_21pairs',{'events':[a]},'accept',{'items':[{'location':{'type':'SourceGeometrySample','original_type':'Polygon','coordinate_pair_count':21,'stored_pair_count':16,'truncated':True},'event_country':None,'published_at':None}],'geometry_pair_cap':16})
# Fuel: independent series/key requirements, numeric units, and allowlisted facts.
a=copy.deepcopy(baselines['my_fuel_latest'][0]);del a['date'];del a['series_type'];add('my_fuel_latest','missing_effective_date_and_series', [a],'reject')
a=copy.deepcopy(baselines['my_fuel_latest'][0]);a['series_type']='TEST_unknown_series';add('my_fuel_latest','unknown_series_type',[a],'reject')
a=copy.deepcopy(baselines['my_fuel_latest'][0]);a['date']='2026-02-30';add('my_fuel_latest','invalid_effective_calendar_date',[a],'reject')
a=copy.deepcopy(baselines['my_fuel_latest'][0]);a['ron95']='TEST_not_numeric';add('my_fuel_latest','nonnumeric_price',[a],'reject')
a=copy.deepcopy(baselines['my_fuel_latest'][0]);a['article_body']='TEST_FORBIDDEN_CONTENT_SENTINEL';add('my_fuel_latest','extra_article_field_never_persisted',[a],'project_or_reject',{'forbidden_marker':'TEST_FORBIDDEN_CONTENT_SENTINEL'})
# Warning: legitimate timezone-naive timestamps, missing stable fields, and unlicensed text dropping.
a=copy.deepcopy(baselines['my_warning'][0]);del a['warning_issue']['issued'];add('my_warning','missing_issue_identity',[a],'reject')
a=copy.deepcopy(baselines['my_warning'][0]);a['valid_from']='TEST_invalid_date';add('my_warning','invalid_supplied_validity',[a],'reject')
a=copy.deepcopy(baselines['my_warning'][0]);a.update(text_en='TEST_FORBIDDEN_CONTENT_SENTINEL',instruction_en='TEST_FORBIDDEN_CONTENT_SENTINEL');a['warning_issue']['article_body']='TEST_FORBIDDEN_CONTENT_SENTINEL';add('my_warning','nested_full_text_never_persisted',[a],'project_or_reject',{'forbidden_marker':'TEST_FORBIDDEN_CONTENT_SENTINEL','items':[{'content_depth':'headline_metadata','published_at':None,'event_time':None,'event_country':None}]})
# NASA UTC metadata identity/date discipline and no content/abstract mirroring.
a=copy.deepcopy(baselines['nasa_metadata'][0]);del a['id'];add('nasa_metadata','missing_integer_post_id',[a],'reject')
a=copy.deepcopy(baselines['nasa_metadata'][0]);a['id']='TEST_not_integer';add('nasa_metadata','nonnumeric_post_id',[a],'reject')
a=copy.deepcopy(baselines['nasa_metadata'][0]);a['date_gmt']='2026-02-30T20:17:16';add('nasa_metadata','invalid_calendar_publication',[a],'reject')
a=copy.deepcopy(baselines['nasa_metadata'][0]);a['content']={'rendered':'TEST_FORBIDDEN_CONTENT_SENTINEL'};a['excerpt']={'rendered':'TEST_FORBIDDEN_CONTENT_SENTINEL'};add('nasa_metadata','article_content_never_persisted',[a],'project_or_reject',{'forbidden_marker':'TEST_FORBIDDEN_CONTENT_SENTINEL','items':[{'content_depth':'headline_metadata'}]})
# Source-specific XML structured metadata: no invented time/geo, source language, and unsafe documents.
a=copy.deepcopy(baselines['gdacs'][0]);a['point']='91 181';add('gdacs','out_of_range_supplied_point',gdacs([a]),'reject')
a=copy.deepcopy(baselines['gdacs'][0]);del a['point'];del a['country'];del a['iso3'];add('gdacs','unknown_geography_preserved',gdacs([a]),'accept',{'items':[{'event_country':None,'location':None,'location_basis':'unknown'}]})
a=copy.deepcopy(baselines['un_zh'][0]);a['pubDate']='TEST_invalid_source_datetime';add('un_zh','invalid_supplied_publication',rss('un_zh',[a],'<language>zh-hans</language>'),'reject')
a=copy.deepcopy(baselines['un_zh'][0]);del a['pubDate'];add('un_zh','absent_publication_stays_unknown',rss('un_zh',[a],'<language>zh-hans</language>'),'accept',{'items':[{'published_at':None,'event_time':None,'event_country':None}]})
add('un_zh','declared_language_mismatch',rss('un_zh',baselines['un_zh'],'<language>en</language>'),'reject')
add('un_zh','xml_dtd_entity_prohibited','<!DOCTYPE rss [<!ENTITY X "TEST_SENTINEL">]>'+rss('un_zh',baselines['un_zh']),'reject')
a=copy.deepcopy(baselines['ecb'][0]);a['pubDate']='Wed, 30 Feb 2026 12:00:00 GMT';add('ecb','invalid_calendar_publication',rss('ecb',[a]),'reject')
a=copy.deepcopy(baselines['bis_press'][0]);a['date']='2026-02-30T00:00:00Z';add('bis_press','invalid_calendar_dc_date',rdf('bis_press',[a]),'reject')
a=copy.deepcopy(baselines['bis_speeches'][0]);a['date']='TEST_invalid_date';add('bis_speeches','invalid_supplied_dc_date',rdf('bis_speeches',[a]),'reject')
# Shared deterministic selection/dedupe/cap behaviors, with no actual data mutation.
rows=[]
for i in range(101):
 a=copy.deepcopy(baselines['usgs'][0]);a['id']='TEST_USGS_'+str(i).zfill(3);a['properties']['title']='TEST synthetic earthquake '+str(i);a['properties']['time']=1791410000000+i*1000;a['properties']['url']='https://earthquake.usgs.gov/earthquakes/eventpage/TEST_USGS_'+str(i).zfill(3);rows.append(a)
add('usgs','newest100_of101_cap',{'type':'FeatureCollection','metadata':{'count':101},'features':rows},'accept',{'result':{'upstream_count':101,'truncated':True},'item_count':100,'first_upstream_id':'TEST_USGS_100','last_upstream_id':'TEST_USGS_001'})
rows=copy.deepcopy(baselines['nasa_metadata'])
add('nasa_metadata','exact_duplicate_id_dedupes',rows+[copy.deepcopy(rows[0])],'accept',{'result':{'upstream_count':3,'upstream_duplicate_keys':1},'item_count':2})
rows=[]
for i in range(100):
 a=copy.deepcopy(baselines['nasa_metadata'][0]);a['id']=999000000+i;a['title']['rendered']='TEST synthetic NASA metadata '+str(i);rows.append(a)
add('nasa_metadata','query_cap100_flag',rows,'accept',{'result':{'upstream_limit_hit':True},'item_count':100})
# Snapshot declarative contracts, separate from frozen source registry and independent of implementation labels.
contracts={
'usgs':{'envelope':'FeatureCollection.features[]; metadata.count, when present, equals returnedfeature count','required':'Nonempty stablefeatureid, title,HTTP(S)eventURL, finite numericmagnitude/time/updated, Pointcoordinates longitude/latitude/depth withrange checks','nullable':'Publication/eventcountry remainnull; optionalmeasurementfacts cannull','empty':'features[] withcoherentmetadata.count0 islegitimate'},
'gdacs':{'envelope':'RSS2channeldirectitemchildren; no hiddenitems ornonzero-countzero projection','required':'Title/link/stableguid ordeclaredURL+publicationfallback; structuredfields retainedonlyif supplied','nullable':'Absentpoint/country/ISO3 remainunknown; absenceisnot permissionto infer','date':'Suppliedinvaliddates fail; absencecanremainnull; occurrencefromdate isindependentofpubDate','geo':'Suppliedpoint latitude/longitude validranges','empty':'CorrectRSSchannelcanlegitimatelybeempty'},
'eonet':{'envelope':'JSONevents[]','required':'NonemptystringeventID/title/HTTP(S)link; geometrywhenpresent hasvalidtype/coordinates/datetime','nullable':'Missinggeometry preservesnull/unknown; publication/country remainsnull','geometry':'OnlyPoint/Polygon documented; non-Pointstoredasdeclaredsamplewithpaircounts/truncation, maximum16storedpairs','empty':'events[] legitimate'},
'un_zh':{'envelope':'RSS2channeldirectitems','required':'Metadataidentity/title/link; providedfeedlanguage mustmatchChinese endpoint','nullable':'AbsentpubDate unknown; Chinese languagenevermeansChinaeventcountry','content':'Headlines/link/timeonly; nodescription/content:encoded/media','empty':'Correctrecognizedcontainerempty legitimate; wrongroot/nonzero-countzero fails'},
'ecb':{'envelope':'RSS2channeldirectitems','required':'Metadataidentity/title/link; suppliedpublicationdate calendar-valid/offset-aware','nullable':'Eventtime/country null; publisherGermany noteventcountry','content':'Metadataonly','empty':'Correctrecognizedempty legitimate'},
'bis_press':{'envelope':'RSS1rdf:RDFrootitems are channel siblings; sequence references coherent withactualitems','required':'title/link andsupplieddc:date; fallbacks deriveURL+publication key andlabel derived','date':'Midnightdc:date remainsflagged exactclockunverified; noeventonsettime','content':'LimitedmetadatawithBIScredit/directoriginallink','empty':'EmptyRDFcontainerwithzero refs legitimate; nonzero refs/zeroitems mustfail'},
'bis_speeches':{'envelope':'SameBISRSS1RDFcoherence; sourceidentityindependentfrompubcountry','date':'Calendar-validsupplieddc:date withmidnightclockuncertainty; eventcountry/timeunknown','content':'No fullspeeches; preserveattribution','empty':'Emptyzero-refRDFlegitimate; hidden/nonzero-refitemsnever silentlyzero'},
'my_fuel_latest':{'envelope':'JSONArray','required':'Calendar-valideffectiveYYYY-MM-DD;series_type level|change_weekly; presentpricefields numbersornull; noundefinedderivedkeys','facts_allowlist':['date','series_type','ron95','ron97','diesel','diesel_eastmsia','ron95_skps','diesel_budi','diesel_skds','ron95_budi95'],'nullable':'Effective dateisdate-only; publication/eventtimestamp remainsnull','content':'Onlyallowlistedlicensedpricefacts; extraunrequestednarrativefields neverpersist','empty':'Avalidarrayempty isstructurallyrecognized butmustnot beclaimedlatestpricingavailability'},
'my_warning':{'envelope':'JSONArray','required':'warning_issue.issued plusvaliditystrings anddisplaytitle/heading sufficientfordeterministicderivedidentity','datetime':'Calendar-validtimezone-naive sourcevalues permittedandkept raw; canonicaltimestamps remainnulluntilverified','content':'Onlyissue/title/heading/validitymetadata; no text/instructions, includingunexpected nestedfields','empty':'[] legitimatecurrentno-warning snapshot'},
'nasa_metadata':{'envelope':'JSONArray; APIerrorobjectmustfail','required':'PositiveintegerpostID;title.rendered/plain safeHTTP(S)link; calendar-validdate_gmt/modified_gmt UTCstrings','content':'Onlyfieldsrequested; content/excerpt/media neverpersist; titlebounded500','empty':'[] legitimateforreal rollingwindow; UTCquery mustbegenerated at runtime, notfixture date'}}
(P/'source-contracts.v0.4.json').write_text(json.dumps({'schema_version':'0.4.0','test_only':True,'production_contract':'Existing parseIntelFeed publicinterface; source-specificmodules ownvalidation; sharedfetch/retry/store unchanged','fetch_frozen_at':FROZEN,'source_contracts':contracts},ensure_ascii=False,indent=2))
(P/'cases.v0.4.json').write_text(json.dumps({'schema_version':'0.4.0','generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'catalog_file':'../source-registry.v0.2.json','fixtures_are_tests_only':True,'source_count':10,'case_count':len(cases),'cases':cases},ensure_ascii=False,indent=2))
print('Built',len(cases),'cases for',len(S),'sources')
