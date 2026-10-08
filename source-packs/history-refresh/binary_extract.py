"""Bounded read-only source-specific workbook decoders. No network, macros or formulas run."""
from pathlib import Path
import json, zipfile, math, re, hashlib, io, datetime

def commodity(body, source, start, end):
    import openpyxl
    with zipfile.ZipFile(io.BytesIO(body)) as archive:
        if sum(x.file_size for x in archive.infolist()) > 33554432:
            raise ValueError('Decoded commodity workbook budget exceeded')
    book = openpyxl.load_workbook(io.BytesIO(body), read_only=True, data_only=True)
    if not {'Monthly Prices', 'Description'} <= set(book.sheetnames):
        raise ValueError('Known commodity worksheets absent')
    rows = list(book['Monthly Prices'].iter_rows(values_only=True))
    if rows[0][0] != 'World Bank Commodity Price Data (The Pink Sheet)' or rows[1][0] != 'monthly prices in nominal US dollars, 1960 to present':
        raise ValueError('Historical nominal monthly scope changed')
    raw_edition = rows[3][0]
    edition = datetime.datetime.strptime(raw_edition, 'Updated on %B %d, %Y').date().isoformat()
    headers, units = rows[4], rows[5]
    names = [x for x in headers[1:] if x is not None]
    if len(names) != len(set(names)) or len(names) != 71:
        raise ValueError('Commodity column schema changed; no guessed remapping')
    observations = {}
    for row in rows[6:]:
        period = row[0]
        if period is None:
            continue
        if not isinstance(period, str) or not re.fullmatch(r'\d{4}M(?:0[1-9]|1[0-2])', period):
            raise ValueError('Invalid source month')
        period = period[:4] + '-' + period[5:]
        if period in observations or period >= edition[:7]:
            raise ValueError('Duplicate or nonhistorical source observation month')
        observations[period] = row
    if not observations:
        raise ValueError('Known workbook cannot silently become empty')
    index = lambda p: int(p[:4]) * 12 + int(p[5:]) - 1
    periods = sorted(observations)
    if [index(p) for p in periods] != list(range(index(periods[0]), index(periods[-1]) + 1)):
        raise ValueError('Source calendar row gap')
    description = list(book['Description'].iter_rows(values_only=True))
    series = []
    for template in source['series_templates']:
        col = headers.index(template['source_name'])
        if units[col] != template['unit_raw']:
            raise ValueError('Native commodity unit changed; no conversion')
        d = description[template['definition_row'] - 1]
        definition, provider = d[1], d[19]
        prefix = template['definition'].split(',')[0]
        if not isinstance(definition, str) or definition != template['definition'] or len(definition) > 1800 or not isinstance(provider, str) or len(provider) > 1800 or provider != template['provider_reference']:
            raise ValueError('Definition mapping/schema changed')
        item = {**template, 'definition': definition, 'provider_reference': provider}
        item['reference_locations'] = [p for p in template['reference_locations'] if p.lower() in definition.lower()]
        item['futures_forward_inputs_mentioned'] = bool(re.search(r'future|forward|nearby contract', definition, re.I))
        item['cells'] = []
        for period in periods:
            if not start <= period <= end:
                continue
            value = observations[period][col]
            if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
                cell = {'period': period, 'raw_value': value, 'value': value, 'missingness': 'supplied_numeric', 'cell_kind': 'number'}
            elif value is None or value in ['…', '...', '..', '']:
                cell = {'period': period, 'raw_value': value, 'value': None, 'missingness': 'source_missing', 'cell_kind': 'blank' if value is None else 'text_marker'}
            else:
                raise ValueError('Unknown commodity missing marker/type')
            item['cells'].append(cell)
        series.append(item)
    if not any(x['cells'] for x in series):
        raise ValueError('Selected source window not present; preserve prior data')
    notes = [{'source_row': i + 1, 'marker_raw': r[0], 'text': r[1]} for i, r in enumerate(description) if i >= 107 and len(r) > 1 and isinstance(r[1], str)]
    return {'series': series, 'source_snapshot': {'edition_date': edition, 'edition_raw': raw_edition, 'latest_observation_month': periods[-1], 'source_available_period': [periods[0], periods[-1]], 'method_change_log': notes, 'estimate_flag_basis': 'Publisher notes; no per-cell binary estimate certainty', 'historical_sheet': 'Monthly Prices', 'quarantined_iron_ore': True}, 'coverage': {'selected_series': 35, 'requested_period': [start, end], 'returned_period': [max(start, periods[0]), min(end, periods[-1])], 'provider_completeness_claim': False}}

def trade(body, start, end):
    import xlrd
    from collections import defaultdict
    member = 'Global safeguard measures/GSGD-WTO.xls'
    with zipfile.ZipFile(io.BytesIO(body)) as archive:
        entries = [x for x in archive.infolist() if not x.is_dir()]
        if len(entries) != 1 or entries[0].filename != member or entries[0].file_size > 8388608:
            raise ValueError('Known bounded trade workbook member changed')
        workbook = archive.read(entries[0])
    book = xlrd.open_workbook(file_contents=workbook)
    expected = json.loads((Path(__file__).parent / 'contracts/trade-headers.json').read_text())
    if book.sheet_names() != list(expected):
        raise ValueError('Trade sheet schema changed')
    tables = {}
    for name, columns in expected.items():
        sheet = book.sheet_by_name(name)
        if sheet.nrows > 25000 or sheet.ncols != len(columns) or sheet.row_values(0) != columns:
            raise ValueError('Trade table headers/budget changed')
        records = []
        for i in range(1, sheet.nrows):
            row = {}
            for j, key in enumerate(columns):
                if not key or key == 'NOTES':
                    continue
                c = sheet.cell(i, j)
                if c.ctype not in [0, 1, 2, 3, 6]:
                    raise ValueError('Unknown/error/boolean source cell')
                value = c.value
                if isinstance(value, float) and not math.isfinite(value):
                    raise ValueError('Nonfinite source cell')
                if key.endswith('_DATE'):
                    day = None
                    if c.ctype == 3:
                        date = xlrd.xldate_as_datetime(value, book.datemode)
                        if (date.hour, date.minute, date.second, date.microsecond) != (0, 0, 0, 0):
                            raise ValueError('Unexpected time component in source date cell')
                        day = date.date().isoformat()
                    row[key] = {'raw_value': value, 'cell_type': {0:'empty',1:'text',2:'number',3:'excel_date',6:'blank'}[c.ctype], 'date': day, 'precision': 'day' if day else 'unknown'}
                else:
                    row[key] = value
            records.append(row)
        tables[name] = records
    groups = defaultdict(list)
    for row in tables['SG-Master']:
        groups[row['CASE_ID']].append(row)
    conflicts = {k for k, rows in groups.items() if any(r != rows[0] for r in rows)}
    selected = [rows[0] for k, rows in groups.items() if k not in conflicts and rows[0]['WTO_INIT_DATE']['date'] and start <= rows[0]['WTO_INIT_DATE']['date'] <= end]
    selected.sort(key=lambda r: (r['WTO_INIT_DATE']['date'], r['CASE_ID']), reverse=True)
    caps = {'SG-Products':24,'SG-QR or TRQ':12,'SG-Final Measures':12,'SG-Exemptions':24}
    candidates = len(selected)
    cases = []
    for row in selected[:100]:
        related = {}
        for name, cap in caps.items():
            matches = [r for r in tables[name] if r['CASE_ID'] == row['CASE_ID']]
            if any('SG_CTY_NAME' in r and r['SG_CTY_NAME'] != row['SG_CTY_NAME'] for r in matches):
                raise ValueError('Related trade rows have ambiguous country identity')
            related[name] = {'matched_count':len(matches),'selected_count':min(len(matches),cap),'cap':cap,'truncated':len(matches)>cap,'selection_basis':'First supplied source rows for this unambiguous case; not exhaustive coverage','rows':matches[:cap]}
        cases.append({'master':row,'related':related})
    if not tables['SG-Master']:
        raise ValueError('Known trade master cannot silently become empty')
    return {'cases':cases,'workbook_date_mode':book.datemode,'source_snapshot':{'workbook_member':member,'workbook_sha256':hashlib.sha256(workbook).hexdigest(),'dataset_vintage_labels':sorted({r['V_NUMBER'] for r in tables['SG-Master']}),'quarantined_case_ids':sorted(conflicts),'conflict_scope':'Global master ID check before period selection; all ambiguous related attachments excluded','codebook_scope':'Safeguard-specific definitions unverified; original stage/decision/unit cells remain uninterpreted'},'coverage':{'requested_period':[start,end],'candidate_unambiguous_cases':candidates,'selected_cases':len(cases),'cap':100,'truncated':candidates>100,'global_conflict_count':len(conflicts),'provider_completeness_claim':False}}

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('kind', choices=['commodity','trade'])
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--start', required=True)
    parser.add_argument('--end', required=True)
    args = parser.parse_args()
    raw = Path(args.input).read_bytes()
    if len(raw) > 2097152:
        raise ValueError('Raw structured workbook cap')
    if args.kind == 'commodity':
        profiles = json.loads((Path(__file__).parent/'../../data/refresh-source-profiles.v0.19.json').read_text())['sources']
        source = next(s for s in profiles if s['refresh_family']=='commodity')
        data = commodity(raw, source, args.start, args.end)
    else:
        data = trade(raw, args.start, args.end)
    Path(args.output).write_text(json.dumps(data,ensure_ascii=False)+'\n')
