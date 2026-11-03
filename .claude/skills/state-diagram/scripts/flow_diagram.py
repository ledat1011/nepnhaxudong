"""Renders a left-to-right component flow (who publishes, who subscribes, which table is written) as SVG,
in the same house style: nodes on a grid, straight or right-angle arrows, one highlight box around the new part.

Usage:  python flow_diagram.py spec.json out.svg
Spec:   see ../references/spec-format.md
"""
import json
import sys
from collections import defaultdict

import svglib
from svglib import Svg, INK, DASH_TEXT, text_width, wrap

TOP, ROW_GAP, MIN_COL_GAP, MARGIN = 230, 190, 130, 40


def main(spec_path, out_path):
    spec = json.load(open(spec_path, encoding='utf-8'))
    svglib.use_palette(spec.get('highlight'))
    nodes = {n['id']: dict(n) for n in spec['nodes']}
    edges = [dict(e) for e in spec['edges']]
    group = spec.get('group')

    for n in nodes.values():
        n['label'] = n['label'] if isinstance(n['label'], list) else [n['label']]
        n.setdefault('shape', 'rect')
        n.setdefault('span', 1)
        pad = 76 if n['shape'] == 'hex' else 44
        n['w'] = n.get('w') or max(160, max(text_width(s, 16) for s in n['label']) + pad)
        n['h'] = n.get('h') or (18 + 21 * len(n['label']) + (12 if n['shape'] == 'cyl' else 0))

    # ---- columns: width of the widest single-column node, gap wide enough for the labels between them ----
    ncols = max(n['col'] + n['span'] for n in nodes.values())
    col_w = [0] * ncols
    for n in nodes.values():
        if n['span'] == 1:
            col_w[n['col']] = max(col_w[n['col']], n['w'])
    gap = [MIN_COL_GAP] * ncols
    by_id = nodes
    for e in edges:
        a, b = by_id[e['from']], by_id[e['to']]
        if a['row'] == b['row'] and abs(a['col'] - b['col']) == 1 and e.get('label'):
            c = min(a['col'], b['col'])
            gap[c] = max(gap[c], max(text_width(s, 16) for s in wrap(e['label'], 30)) + 40)
    if group:
        first = min(by_id[i]['col'] for i in group['nodes'])
        last = max(by_id[i]['col'] + by_id[i]['span'] - 1 for i in group['nodes'])
        if first > 0:
            gap[first - 1] += 40
        if last < ncols - 1:
            gap[last] += 40
    col_x = []
    x = MARGIN
    for c in range(ncols):
        col_x.append(x)
        x += col_w[c] + gap[c]

    def geom(n):
        x0 = col_x[n['col']]
        x1 = col_x[n['col'] + n['span'] - 1] + col_w[n['col'] + n['span'] - 1]
        w = (x1 - x0) if n['span'] > 1 else n['w']
        x0 = x0 + ((x1 - x0) - w) / 2 if n['span'] == 1 else x0
        cy = TOP + n['row'] * ROW_GAP
        return x0, cy - n['h'] / 2, w, n['h']

    for n in nodes.values():
        n['x0'], n['y0'], n['w'], n['h'] = geom(n)
        n['cx'], n['cy'] = n['x0'] + n['w'] / 2, n['y0'] + n['h'] / 2
        n['x1'], n['y1'] = n['x0'] + n['w'], n['y0'] + n['h']

    svg = Svg()

    # ---- highlight box ----------------------------------------------------------------------------------
    if group:
        g = [by_id[i] for i in group['nodes']]
        has_loop = any(e['from'] == e['to'] and e['from'] in group['nodes'] for e in edges)
        bx0, bx1 = min(n['x0'] for n in g) - 40, max(n['x1'] for n in g) + 40
        by0 = min(n['y0'] for n in g) - (110 if has_loop else 70)
        by1 = max(n['y1'] for n in g) + 40
        svg.highlight_box(bx0, by0, bx1 - bx0, by1 - by0, group.get('title', '★ new'))

    def color(e):
        return svglib.NEW_TEXT if e.get('style') == 'new' else (DASH_TEXT if e.get('style') == 'dash' else INK)

    # spread several arrows that leave the right side of the same node
    right_out = defaultdict(list)
    for e in edges:
        a, b = by_id[e['from']], by_id[e['to']]
        if e['from'] != e['to'] and b['col'] > a['col'] + a['span'] - 1 and e.get('route', 'auto') != 'v':
            right_out[e['from']].append(e)
    for es in right_out.values():
        es.sort(key=lambda e: by_id[e['to']]['row'])
        for i, e in enumerate(es):
            e['dy'] = 0 if len(es) == 1 else -12 + 26 * i / (len(es) - 1)

    # ---- edges ------------------------------------------------------------------------------------------
    for e in edges:
        a, b, st = by_id[e['from']], by_id[e['to']], e.get('style', 'solid')
        lbl = e.get('label')
        if a is b:                                                  # loop on top
            ty = a['y0']
            svg.path([(a['cx'] - 60, ty), (a['cx'] - 60, ty - 44), (a['cx'] + 60, ty - 44), (a['cx'] + 60, ty - 2)], st)
            if lbl:
                svg.label(a['cx'], ty - 62, wrap(lbl, 40), color=color(e), anchor='middle')
            continue
        same_row = a['row'] == b['row']
        overlap_x = not (b['x1'] < a['x0'] or b['x0'] > a['x1'])
        if same_row:                                                # straight horizontal
            yy = a['cy'] + e.get('dy', 0)
            if b['x0'] >= a['x1']:
                svg.path([(a['x1'], yy), (b['x0'] - 2, yy)], st)
                mid = (a['x1'] + b['x0']) / 2
            else:
                svg.path([(a['x0'], yy), (b['x1'] + 2, yy)], st)
                mid = (a['x0'] + b['x1']) / 2
            if lbl:
                svg.label(mid, yy - 18, wrap(lbl, 30), color=color(e), anchor='middle')
        elif overlap_x and e.get('route', 'auto') in ('auto', 'v'):  # straight vertical
            xx = a['cx'] if b['x0'] <= a['cx'] <= b['x1'] else (max(a['x0'], b['x0']) + min(a['x1'], b['x1'])) / 2
            down = b['row'] > a['row']
            y_from, y_to = (a['y1'], b['y0'] - 2) if down else (a['y0'], b['y1'] + 2)
            svg.path([(xx, y_from), (xx, y_to)], st)
            if lbl:
                svg.label(xx + 14, (y_from + y_to) / 2, wrap(lbl, 30), color=color(e))
        elif e.get('route') == 'hvh' or (e.get('route', 'auto') == 'auto' and b['x0'] > a['x1']):
            # right side out, down/up, into the near side of the target
            yy = a['cy'] + e.get('dy', 0)
            turn = a['x1'] + e.get('turn', 120)
            svg.path([(a['x1'], yy), (turn, yy), (turn, b['cy']), (b['x0'] - 2, b['cy'])], st)
            if lbl:
                svg.label(turn + 12, (yy + b['cy']) / 2, wrap(lbl, 24), color=color(e))
        else:                                                       # 'vh': down from the bottom, then sideways
            xx = a['cx']
            y_from = a['y1'] if b['row'] > a['row'] else a['y0']
            tx = b['x1'] + 2 if b['x1'] < xx else b['x0'] - 2
            svg.path([(xx, y_from), (xx, b['cy']), (tx, b['cy'])], st)
            if lbl:
                svg.label((xx + tx) / 2, b['cy'] - 18, wrap(lbl, 32), color=color(e), anchor='middle')

    # ---- nodes on top -----------------------------------------------------------------------------------
    for n in nodes.values():
        svg.shape(n['shape'] if n['shape'] != 'hex' else 'wait', n['x0'], n['y0'], n['w'], n['h'], new=n.get('new'))
        step = 21
        top = n['cy'] + (5 if n['shape'] == 'cyl' else 0) - step * (len(n['label']) - 1) / 2
        for i, line in enumerate(n['label']):
            svg.text(n['cx'], top + i * step, line, size=16,
                     weight='bold' if (i == 0 and n.get('bold_first')) else 'normal')

    width = max(n['x1'] for n in nodes.values()) + MARGIN
    height = max(n['y1'] for n in nodes.values()) + 80
    svg.write(out_path, width, height)
    print(f'ok {out_path} {int(width)}x{int(height)}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], sys.argv[2])
