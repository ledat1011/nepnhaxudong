"""Renders a status state machine from a JSON spec as SVG, in the house style:
one straight column of equal-width states, right-angle detours on the sides, only new states highlighted,
labels only where a state has more than one incoming or outgoing arrow.

Usage:  python state_machine.py spec.json out.svg
Spec:   see ../references/spec-format.md
"""
import json
import sys
from collections import defaultdict

import svglib
from svglib import Svg, DASH_TEXT, INK, text_width, wrap

W, H, GAP, WIDE_GAP, TOP = 340, 46, 86, 170, 150
LEFT_LANE_STEP, RIGHT_LANE_STEP = 140, 46
SIDE_NODE_W = 170


def main(spec_path, out_path):
    spec = json.load(open(spec_path, encoding='utf-8'))
    svglib.use_palette(spec.get('highlight'))
    column = spec['column']
    ids = [n['id'] for n in column]
    kind = {n['id']: n.get('kind', 'done') for n in column}
    label_of = {n['id']: n.get('label', n['id']) for n in column}
    new = set(spec.get('new', []))
    side = {s['id']: s for s in spec.get('side', [])}          # nodes to the right of a column row
    for s in side.values():
        kind[s['id']] = s.get('kind', 'terminal')
        label_of[s['id']] = s.get('label', s['id'])
    edges = [dict(e) for e in spec['edges']]
    row = {n: i for i, n in enumerate(ids)}

    # ---- rows: wider gap above and below a highlighted state -------------------------------------------
    y, cur = {}, TOP
    for i, n in enumerate(ids):
        if i:
            cur += WIDE_GAP if (n in new or ids[i - 1] in new) else GAP
        y[n] = cur
    for s in side.values():
        y[s['id']] = y[s['row']]

    # ---- degrees for the label rule ---------------------------------------------------------------------
    indeg, outdeg = defaultdict(int), defaultdict(int)
    for e in edges:
        indeg[e['to']] += 1
        outdeg[e['from']] += 1
    if spec.get('start'):
        indeg[ids[0]] += 1
    missing = []

    def show_label(e):
        need = indeg[e['to']] > 1 or outdeg[e['from']] > 1 or e.get('force_label')
        if need and not e.get('label'):
            missing.append(f"{e['from']} -> {e['to']}")
        return e.get('label') if need else None

    # ---- classify edges ---------------------------------------------------------------------------------
    for e in edges:
        f, t = e['from'], e['to']
        if f == t:
            e['type'] = 'loop'
        elif t in side and side[t]['row'] == f:
            e['type'] = 'side'
        elif f in row and t in row and row[t] == row[f] + 1:
            e['type'] = 'down'
        elif f in row and t in row and row[t] > row[f]:
            e['type'] = 'skip_right' if e.get('side') == 'right' else 'skip_left'
        elif f in row and t in row:
            e['type'] = 'up'
        else:
            raise SystemExit(f'cannot place edge {f} -> {t}')

    # left lanes: shortest span innermost
    left = sorted([e for e in edges if e['type'] == 'skip_left'], key=lambda e: row[e['to']] - row[e['from']])
    for i, e in enumerate(left):
        e['lane'] = i
    # right side: up-edges share an inner lane when their spans do not overlap
    ups = sorted([e for e in edges if e['type'] == 'up'], key=lambda e: row[e['to']])
    up_lanes = []
    for e in ups:
        lo, hi = row[e['to']], row[e['from']]
        for i, last_hi in enumerate(up_lanes):
            if lo >= last_hi:
                e['lane'], up_lanes[i] = i, hi
                break
        else:
            e['lane'] = len(up_lanes)
            up_lanes.append(hi)
    rights = sorted([e for e in edges if e['type'] == 'skip_right'], key=lambda e: row[e['to']] - row[e['from']])
    for i, e in enumerate(rights):
        e['lane'] = i

    # ---- x layout ---------------------------------------------------------------------------------------
    left_need = 40 + len(left) * LEFT_LANE_STEP + (220 if left else 0)
    CX = max(760, left_need + W / 2)
    LEFT, RIGHT = CX - W / 2, CX + W / 2
    up_x = lambda lane: RIGHT + 40 + lane * RIGHT_LANE_STEP
    right_base = RIGHT + 40 + max(len(up_lanes), 1) * RIGHT_LANE_STEP + 150
    skip_r_x = lambda lane: right_base + lane * 120
    left_x = lambda lane: LEFT - 110 - lane * LEFT_LANE_STEP

    # attachment offsets on the sides of a node
    right_has_side = {e['from'] for e in edges if e['type'] == 'side'}
    left_entries = defaultdict(list)
    for e in left:
        left_entries[e['to']].append(e)
    for t, es in left_entries.items():          # outer lane enters lower, so lanes never cross
        es.sort(key=lambda e: e['lane'])
        n = len(es)
        for i, e in enumerate(es):
            e['entry_dy'] = 0 if n == 1 else -10 + 20 * i / (n - 1)

    def right_dy(node, going_down):
        attached = [e for e in edges if e['type'] in ('up', 'skip_right') and node in (e['from'], e['to'])]
        if len(attached) < 2:
            return 0
        return -10 if going_down else 10

    svg = Svg()
    loops_below = {}

    # ---- highlight boxes ---------------------------------------------------------------------------------
    box, missing_title = {}, []
    for n in new:
        has_bottom_loop = any(e['type'] == 'loop' and e['from'] == n for e in edges) and n in right_has_side
        bx0, by0 = LEFT - 26, y[n] - H / 2 - 40
        bh = H + (103 if has_bottom_loop else 66)
        box[n] = (bx0, by0, bh)
        title = spec.get('highlight_titles', {}).get(n, spec.get('highlight_label', '★ new'))
        if text_width(title, 15) * 1.08 > W / 2 + 26 - 14 - 4:      # bold; must end before the incoming arrow
            missing_title.append(f'{n}: "{title}"')
        svg.highlight_box(bx0, by0, W + 52, bh, title)

    def color_of(e):
        return svglib.NEW_TEXT if e.get('style') == 'new' else (DASH_TEXT if e.get('style') == 'dash' else INK)

    # ---- start ------------------------------------------------------------------------------------------
    if spec.get('start'):
        sy = y[ids[0]] - GAP
        svg.path([(CX, sy + 10), (CX, y[ids[0]] - H / 2 - 2)])
        if indeg[ids[0]] > 1:
            svg.label(CX + 12, (sy + 10 + y[ids[0]] - H / 2) / 2, spec['start'])

    # ---- edges ------------------------------------------------------------------------------------------
    for e in edges:
        f, t, st, lbl = e['from'], e['to'], e.get('style', 'solid'), show_label(e)
        if e['type'] == 'down':
            top, end = y[f] + H / 2, y[t] - H / 2
            svg.path([(CX, top), (CX, end - 2)], st)
            if lbl:
                ly0 = box[f][1] + box[f][2] if f in box else top
                ly1 = box[t][1] if t in box else end
                svg.label(CX + 12, (ly0 + ly1) / 2, wrap(lbl, 30), color=color_of(e))
        elif e['type'] == 'side':
            sx = RIGHT + 330
            yy = y[f] - (8 if any(x['type'] == 'loop' and x['from'] == f for x in edges) else 0)
            svg.path([(RIGHT, yy), (sx - SIDE_NODE_W / 2 - 2, yy)], st)
            side[t]['_x'], side[t]['_y'] = sx, yy
            if lbl:
                svg.label((RIGHT + 26 + sx - SIDE_NODE_W / 2) / 2, yy - 28, wrap(lbl, 26), color=color_of(e),
                          anchor='middle', size=16)
        elif e['type'] == 'skip_left':
            lx = left_x(e['lane'])
            ty = y[t] + e.get('entry_dy', 0)
            svg.path([(LEFT, y[f]), (lx, y[f]), (lx, ty), (LEFT - 2, ty)], st)
            if lbl:
                mid = (y[f] + y[t]) / 2
                if e['lane'] == len(left) - 1:          # outermost: label outside, right-aligned
                    svg.label(lx - 12, mid, wrap(lbl, 26), color=color_of(e), anchor='end', size=16)
                else:                                    # between this lane and the next outer one
                    svg.label((lx + left_x(e['lane'] + 1)) / 2, mid, wrap(lbl, 14), color=color_of(e),
                              anchor='middle', size=16)
        elif e['type'] == 'up':
            ux = up_x(e['lane'])
            fy, ty = y[f] + right_dy(f, False), y[t] + right_dy(t, False)
            svg.path([(RIGHT, fy), (ux, fy), (ux, ty), (RIGHT + 2, ty)], st)
            if lbl:
                svg.label(ux + 10, (fy + ty) / 2 + 6, wrap(lbl, 22), color=color_of(e))
        elif e['type'] == 'skip_right':
            rx = skip_r_x(e['lane'])
            fy = y[f] + right_dy(f, True)
            svg.path([(RIGHT, fy), (rx, fy), (rx, y[t]), (RIGHT + 2, y[t])], st)
            if lbl:
                svg.label((RIGHT + rx) / 2 + 30, fy - 16, lbl, color=color_of(e), anchor='middle')
        elif e['type'] == 'loop':
            yy = y[f]
            if f in right_has_side:     # right side is taken by a side arrow: loop around the bottom-right corner
                svg.path([(RIGHT, yy + 12), (RIGHT + 14, yy + 12), (RIGHT + 14, yy + H / 2 + 16),
                          (RIGHT - 60, yy + H / 2 + 16), (RIGHT - 60, yy + H / 2 + 2)], st)
                if lbl:
                    svg.label(RIGHT + 18, yy + H / 2 + 44, wrap(lbl, 18), color=color_of(e), anchor='end')
            else:
                svg.path([(RIGHT - 2, yy - 9), (RIGHT + 34, yy - 9), (RIGHT + 34, yy + 9), (RIGHT + 2, yy + 9)], st)
                if lbl:
                    svg.label(RIGHT + 44, yy, lbl, color=color_of(e))

    # ---- free pairs on the far right (e.g. "any non-terminal status" -> EXPIRED) -----------------------
    far_x = max([right_base + len(rights) * 120 + 200, RIGHT + 470])
    max_x = far_x
    for i, p in enumerate(spec.get('free', [])):
        fx = far_x + i * 320
        y1, y2 = y[ids[0]], y[ids[min(2, len(ids) - 1)]]
        svg.path([(fx, y1 + H / 2), (fx, y2 - H / 2 - 2)], p.get('style', 'dash'))
        svg.shape(p.get('from_kind', 'note'), fx - 125, y1 - H / 2, 250, H)
        svg.text(fx, y1, p['from'], size=17)
        svg.shape(p.get('to_kind', 'terminal'), fx - 80, y2 - H / 2, 160, H)
        svg.text(fx, y2, p['to'], size=17)
        if p.get('label'):
            svg.label(fx + 12, (y1 + y2) / 2, wrap(p['label'], 14), color=DASH_TEXT)
        max_x = fx + 260

    # ---- nodes on top -----------------------------------------------------------------------------------
    if spec.get('start'):
        svg.start_dot(CX, y[ids[0]] - GAP)
    for n in ids:
        svg.shape(kind[n], LEFT, y[n] - H / 2, W, H, new=n in new)
        svg.text(CX, y[n], label_of[n], size=17, weight='bold' if n in new else 'normal',
                 color=svglib.NEW_TITLE if n in new else INK)
    for s in side.values():
        sx, sy = s.get('_x', RIGHT + 330), s.get('_y', y[s['id']])
        svg.shape(kind[s['id']], sx - SIDE_NODE_W / 2, sy - H / 2, SIDE_NODE_W, H, new=s['id'] in new)
        svg.text(sx, sy, label_of[s['id']], size=17)
        max_x = max(max_x, sx + SIDE_NODE_W / 2 + 40)

    # ---- notes: an explanation box beside a highlighted state, joined to its box by a line ------------------
    legend_bottom = 30 + 50 + 4 * 34 + 3 * 22 + 10
    for note in spec.get('notes', []):
        n, on_left = note['at'], note.get('side', 'left') == 'left'
        lines = []
        for item in note['lines']:
            for i, part in enumerate(wrap(item, note.get('wrap', 46))):
                lines.append((False, '• ' + part) if i == 0 else (True, part))
        title = note.get('title')
        w = max([text_width(s, 15) + (12 if cont else 0) for cont, s in lines] + [text_width(title or '', 15) * 1.08]) + 30
        h = 20 + (26 if title else 0) + 20 * len(lines)
        hb = box.get(n, (LEFT - 26, y[n] - H / 2 - 40, H + 66))
        if on_left:
            nx1 = LEFT - 26 - 50
            nx0 = nx1 - w
            if nx0 < 20:
                print(f'WARNING: note for {n} is too wide for the left side ({int(w)} px) - shorten the lines')
        else:
            nx0 = RIGHT + note.get('offset', 360)
            nx1 = nx0 + w
        top = y[n] - h / 2 + note.get('dy', 0)
        if on_left and nx0 < 340:                    # stay below the legend
            top = max(top, legend_bottom + 20)
        cy = y[n] + note.get('connector_dy', 0 if on_left else H / 2 + 14)
        cy = min(max(cy, top + 12), top + h - 12)
        if on_left:
            svg.parts.append(f'<path d="M {nx1:.1f},{cy:.1f} L {hb[0]:.1f},{cy:.1f}" stroke="{svglib.NEW}" stroke-width="2"/>')
        else:
            svg.parts.append(f'<path d="M {RIGHT + 26:.1f},{cy:.1f} L {nx0:.1f},{cy:.1f}" stroke="{svglib.NEW}" stroke-width="2"/>')
        svg.parts.append(f'<rect x="{nx0:.1f}" y="{top:.1f}" width="{w:.1f}" height="{h:.1f}" rx="6" fill="#ffffff" '
                         f'stroke="{svglib.NEW}" stroke-width="2"/>')
        ty = top + 22
        if title:
            svg.text(nx0 + 14, ty, title, size=15, weight='bold', color=svglib.NEW_TITLE, anchor='start')
            ty += 26
        for cont, s in lines:                        # a wrapped bullet line is indented under the bullet text
            svg.text(nx0 + 14 + (12 if cont else 0), ty, s, size=15, anchor='start')
            ty += 20
        max_x = max(max_x, nx1 + 40)

    # ---- legend -----------------------------------------------------------------------------------------
    names = spec.get('legend', {})
    used = {kind[n] for n in kind}
    shapes = [(k, names.get(k, d)) for k, d in [('claim', 'claim (-ING)'), ('done', 'done (-ED) / terminal'),
                                                 ('wait', 'waiting'), ('new', 'new status')]
              if k in used or (k == 'new' and new) or (k == 'done' and 'terminal' in used)]
    styles = {e.get('style', 'solid') for e in edges}
    arrows = [(s, names.get('arrow_' + s, names.get(s, d))) for s, d in [('solid', 'transition'), ('new', 'new transition'),
                                                 ('dash', 'rollback / expiry')] if s in styles]
    svg.legend(40, 30, shapes, arrows)

    svg.write(out_path, max_x, y[ids[-1]] + 60)
    print(f'ok {out_path} {int(max_x)}x{int(y[ids[-1]] + 60)}')
    for m in missing_title:
        print(f'WARNING: box title too long, the incoming arrow crosses it - shorten it: {m}')
    for m in missing:
        print(f'WARNING: label needed (target has several incoming or source several outgoing arrows): {m}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], sys.argv[2])
