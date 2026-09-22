"""Cross-user RLS smoke test against the LOCAL Supabase stack.

Creates two throwaway users, writes rows as A, verifies B/anon cannot read or change them,
checks the inventory stock trigger and community membership rules, then deletes both users.

Usage:  supabase status -o env | grep -E "^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=" > /tmp/local.env
        python3 scripts/rls-smoke.py /tmp/local.env
Never point it at a cloud project: it needs the service-role key.
"""
import json, os, sys, uuid, urllib.request, urllib.error
env = dict(l.strip().split('=',1) for l in open(sys.argv[1]) if '=' in l)
env = {k: v.strip('"') for k, v in env.items()}
URL, ANON, SR = env['API_URL'], env['ANON_KEY'], env['SERVICE_ROLE_KEY']
def req(method, path, key, token=None, body=None, prefer='return=representation'):
    h = {'apikey': key, 'Content-Type': 'application/json', 'Prefer': prefer}
    h['Authorization'] = f'Bearer {token or key}'
    r = urllib.request.Request(URL + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r) as resp:
            t = resp.read().decode(); return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode(); return e.code, (json.loads(t) if t else None)
tag = uuid.uuid4().hex[:8]; users = []
def mk(n):
    email = f'rls-{n}-{tag}@test.local'; pw = 'Test-' + uuid.uuid4().hex
    s, u = req('POST', '/auth/v1/admin/users', SR, body={'email': email, 'password': pw, 'email_confirm': True})
    assert s in (200, 201), (s, u); users.append(u['id'])
    s, tok = req('POST', '/auth/v1/token?grant_type=password', ANON, body={'email': email, 'password': pw})
    assert s == 200, (s, tok); return tok['access_token'], u['id']
fails = []; passes = 0
def check(name, cond, detail=''):
    global passes
    if cond: passes += 1
    else: fails.append(f'{name} {detail}')
try:
    A, aid = mk('a'); B, bid = mk('b')
    rows = {}
    def ins(tok, table, body):
        s, d = req('POST', f'/rest/v1/{table}', ANON, tok, body)
        check(f'insert {table}', s == 201, f'{s} {d}'); return d[0] if s == 201 else None
    farm = ins(A, 'farms', {'name': f'Shamba {tag}', 'region': 'Arusha', 'area_ha': 2})
    plot = ins(A, 'plots', {'farm_id': farm['id'], 'name': f'Plot {tag}', 'crop': 'maize', 'status': 'growing'})
    ins(A, 'finance_entries', {'kind': 'expense', 'category': 'seed', 'amount_tzs': 5000, 'entry_date': '2026-09-01'})
    ins(A, 'payment_records', {'direction': 'sent', 'counterparty': 'Agro dealer', 'amount_tzs': 5000, 'network': 'mpesa'})
    animal = ins(A, 'livestock', {'species': 'goat', 'tag_or_name': f'G-{tag}', 'status': 'active'})
    ins(A, 'livestock_events', {'animal_id': animal['id'], 'kind': 'vaccination', 'event_date': '2026-09-01'})
    item = ins(A, 'inventory_items', {'name': f'Seed {tag}', 'category': 'seed', 'quantity': 10, 'unit': 'kg'})
    dev = ins(A, 'iot_devices', {'name': f'Probe {tag}', 'kind': 'soil_moisture'})
    ins(A, 'iot_readings', {'device_id': dev['id'], 'metric': 'soil_moisture', 'value': 40, 'unit': '%'})
    pol = ins(A, 'insurance_policies', {'provider': 'Insurer', 'crop_or_asset': 'Maize', 'status': 'active', 'start_date': '2026-06-01', 'end_date': '2027-05-31'})
    ins(A, 'insurance_claims', {'policy_id': pol['id'], 'incident_date': '2026-09-01', 'incident_type': 'drought', 'description': 'Dry spell'})
    ins(A, 'consultation_requests', {'topic': 'Pests', 'description': 'Leaves yellowing', 'preferred_language': 'sw'})
    # inventory trigger: movement changes stock atomically; negative stock rejected
    s, mv = req('POST', '/rest/v1/inventory_movements', ANON, A, {'item_id': item['id'], 'delta': -4, 'reason': 'use', 'movement_date': '2026-09-02'})
    check('movement insert', s == 201, f'{s} {mv}')
    s, it = req('GET', f"/rest/v1/inventory_items?id=eq.{item['id']}&select=quantity", ANON, A)
    check('trigger applied stock', s == 200 and float(it[0]['quantity']) == 6, f'{s} {it}')
    s, d = req('POST', '/rest/v1/inventory_movements', ANON, A, {'item_id': item['id'], 'delta': -100, 'reason': 'use', 'movement_date': '2026-09-02'})
    check('overdraw rejected', s >= 400, f'{s} {d}')
    s, d = req('PATCH', f"/rest/v1/inventory_items?id=eq.{item['id']}", ANON, A, {'quantity': 999})
    s2, it = req('GET', f"/rest/v1/inventory_items?id=eq.{item['id']}&select=quantity", ANON, A)
    check('direct quantity edit blocked', float(it[0]['quantity']) == 6, f'{s} {d} {it}')
    # cross-user isolation
    owner_tables = ['farms','plots','finance_entries','payment_records','livestock','livestock_events','inventory_items',
                    'inventory_movements','iot_devices','iot_readings','insurance_policies','insurance_claims','consultation_requests']
    for t in owner_tables:
        s, d = req('GET', f'/rest/v1/{t}?select=*', ANON, B)
        check(f'B cannot read {t}', s == 200 and d == [], f'{s} {d}')
        s, d = req('GET', f'/rest/v1/{t}?select=*', ANON)
        check(f'anon cannot read {t}', s in (401, 403) or d == [], f'{s} {d}')
        s, d = req('GET', f'/rest/v1/{t}?select=*', ANON, A)
        check(f'A reads own {t}', s == 200 and len(d) >= 1, f'{s} {d}')
    for t, row in [('farms', farm), ('livestock', animal), ('inventory_items', item), ('iot_devices', dev), ('insurance_policies', pol)]:
        s, d = req('PATCH', f"/rest/v1/{t}?id=eq.{row['id']}", ANON, B, {'name': 'hacked'} if t == 'iot_devices' else {'notes': 'hacked'})
        check(f'B cannot update {t}', s in (200, 204) and not d, f'{s} {d}')
        s, d = req('DELETE', f"/rest/v1/{t}?id=eq.{row['id']}", ANON, B)
        check(f'B cannot delete {t}', s in (200, 204) and not d, f'{s} {d}')
        s, d = req('GET', f"/rest/v1/{t}?id=eq.{row['id']}&select=id", ANON, A)
        check(f'{t} survives B', len(d) == 1, f'{d}')
    # B cannot attach children to A's parents
    s, d = req('POST', '/rest/v1/plots', ANON, B, {'farm_id': farm['id'], 'name': f'X {tag}', 'status': 'planned'})
    check("B cannot add plot to A's farm", s >= 400, f'{s} {d}')
    s, d = req('POST', '/rest/v1/inventory_movements', ANON, B, {'item_id': item['id'], 'delta': 1, 'reason': 'purchase', 'movement_date': '2026-09-02'})
    check("B cannot move A's stock", s >= 400, f'{s} {d}')
    s, d = req('POST', '/rest/v1/iot_readings', ANON, B, {'device_id': dev['id'], 'metric': 'x', 'value': 1})
    check("B cannot add reading to A's device", s >= 400, f'{s} {d}')
    s, d = req('POST', '/rest/v1/farms', ANON, B, {'name': 'spoof', 'user_id': aid})
    check('B cannot insert as A', s >= 400, f'{s} {d}')
    # consultation: client cannot set its own answer/status
    s, d = req('GET', '/rest/v1/consultation_requests?select=id', ANON, A)
    cid = d[0]['id']
    req('PATCH', f'/rest/v1/consultation_requests?id=eq.{cid}', ANON, A, {'status': 'answered', 'answer': 'fake'})
    s, d = req('GET', f'/rest/v1/consultation_requests?id=eq.{cid}&select=status,answer', ANON, A)
    check('owner cannot self-answer consultation', d[0]['status'] == 'submitted' and d[0]['answer'] is None, f'{d}')
    # community: groups readable, posts members-only
    g = ins(A, 'peer_groups', {'name': f'Maize growers {tag}', 'description': 'd'})
    s, d = req('GET', f"/rest/v1/peer_group_members?group_id=eq.{g['id']}&user_id=eq.{aid}&select=role", ANON, A)
    check('creator is admin', s == 200 and d and d[0]['role'] == 'admin', f'{s} {d}')
    ins(A, 'peer_posts', {'group_id': g['id'], 'body': 'Karibu'})
    s, d = req('GET', f"/rest/v1/peer_groups?id=eq.{g['id']}", ANON, B)
    check('B can discover group', s == 200 and len(d) == 1, f'{s} {d}')
    s, d = req('GET', f"/rest/v1/peer_posts?group_id=eq.{g['id']}", ANON, B)
    check('non-member cannot read posts', s == 200 and d == [], f'{s} {d}')
    s, d = req('POST', '/rest/v1/peer_posts', ANON, B, {'group_id': g['id'], 'body': 'spam'})
    check('non-member cannot post', s >= 400, f'{s} {d}')
    s, d = req('POST', '/rest/v1/peer_group_members', ANON, B, {'group_id': g['id'], 'user_id': aid, 'role': 'member'})
    check('B cannot enrol someone else', s >= 400, f'{s} {d}')
    s, d = req('POST', '/rest/v1/peer_group_members', ANON, B, {'group_id': g['id']})
    check('B can join', s == 201, f'{s} {d}')
    s, d = req('GET', f"/rest/v1/peer_posts?group_id=eq.{g['id']}", ANON, B)
    check('member reads posts', s == 200 and len(d) == 1, f'{s} {d}')
    s, d = req('POST', '/rest/v1/peer_group_members', ANON, B, {'group_id': g['id'], 'role': 'admin'})
    s2, d2 = req('GET', f"/rest/v1/peer_group_members?group_id=eq.{g['id']}&user_id=eq.{bid}&select=role", ANON, B)
    check('B cannot make self admin', d2 and d2[0]['role'] == 'member', f'{s} {d} {d2}')
finally:
    for uid in users:
        req('DELETE', f'/auth/v1/admin/users/{uid}', SR)
print(f'PASS {passes}  FAIL {len(fails)}')
for f in fails: print('FAIL', f[:300])
