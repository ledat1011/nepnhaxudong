"""Shared SVG primitives for the state-diagram skill (shapes, orthogonal arrows, labels, legend)."""

INK = '#37474f'
NEW = '#ff6d00'          # new transitions and the highlight box border
NEW_TEXT = '#d84315'     # labels of new transitions
NEW_TITLE = '#bf360c'    # text inside the highlighted state / box title
NEW_FILL = '#ffeb3b'     # fill of a new state
BOX_FILL = '#fff8c4'     # fill of the highlight box
DASH = '#9e9e9e'         # rollback / expiry arrows
DASH_TEXT = '#757575'
FONT = 'Arial, Helvetica, sans-serif'

# "new" = what the change adds (yellow / orange); "problem" = where the flow gets stuck or fails (red)
PALETTES = {
    'new': dict(NEW='#ff6d00', NEW_TEXT='#d84315', NEW_TITLE='#bf360c', NEW_FILL='#ffeb3b', BOX_FILL='#fff8c4'),
    'problem': dict(NEW='#d32f2f', NEW_TEXT='#c62828', NEW_TITLE='#b71c1c', NEW_FILL='#ffcdd2', BOX_FILL='#ffebee'),
}


def use_palette(name):
    """Switches the highlight colours for the whole diagram ('new' or 'problem')."""
    globals().update(PALETTES[name or 'new'])


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def text_width(s, size=15):
    """Rough width of a text in px (Arial); used to size nodes and lane gaps."""
    width = 0.0
    for ch in str(s):
        if ch.isupper() or ch.isdigit() or ch in '_@%#':
            width += 0.68
        elif ch in ' .,:;|!il\'':
            width += 0.30
        else:
            width += 0.55
    return width * size


def wrap(s, max_chars=24):
    """Splits a label into lines of at most max_chars, at spaces. A list stays as given."""
    if isinstance(s, list):
        return s
    words, lines, cur = str(s).split(' '), [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > max_chars:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + ' ' + w).strip()
    if cur:
        lines.append(cur)
    return lines


class Svg:
    def __init__(self):
        self.parts = []

    # ---- text -------------------------------------------------------------------------------------------
    def text(self, x, y, s, size=16, weight='normal', color=INK, anchor='middle'):
        self.parts.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{color}" '
                          f'text-anchor="{anchor}" dominant-baseline="central">{esc(s)}</text>')

    def label(self, x, y, lines, color=INK, anchor='start', size=15, weight='normal'):
        lines = wrap(lines)
        step = size + 4
        top = y - step * (len(lines) - 1) / 2
        for i, line in enumerate(lines):
            self.text(x, top + i * step, line, size=size, color=color, anchor=anchor, weight=weight)

    # ---- arrows -----------------------------------------------------------------------------------------
    def path(self, points, style='solid', marker=True):
        d = 'M ' + ' L '.join(f'{x:.1f},{y:.1f}' for x, y in points)
        if style == 'new':
            s, m = f'stroke="{NEW}" stroke-width="3.5"', 'url(#arrowNew)'
        elif style == 'dash':
            s, m = f'stroke="{DASH}" stroke-width="1.8" stroke-dasharray="7 6"', 'url(#arrowDash)'
        else:
            s, m = f'stroke="{INK}" stroke-width="2"', 'url(#arrow)'
        end = f' marker-end="{m}"' if marker else ''
        self.parts.append(f'<path d="{d}" fill="none" {s} stroke-linejoin="miter"{end}/>')

    # ---- shapes -----------------------------------------------------------------------------------------
    def shape(self, kind, x0, y0, w, h, new=False):
        fill = NEW_FILL if new else '#ffffff'
        stroke = NEW if new else INK
        sw = 3.5 if new else 1.8
        cy = y0 + h / 2
        if kind == 'wait':
            d = 18
            pts = f'{x0},{cy} {x0 + d},{y0} {x0 + w - d},{y0} {x0 + w},{cy} {x0 + w - d},{y0 + h} {x0 + d},{y0 + h}'
            self.parts.append(f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
        elif kind in ('claim', 'rect'):
            self.parts.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
        elif kind == 'note':
            self.parts.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="#ffffff" stroke="{DASH}" '
                              f'stroke-width="1.6" stroke-dasharray="6 5"/>')
        elif kind == 'cyl':
            e = 12
            self.parts.append(f'<path d="M {x0},{y0 + e} A {w / 2},{e} 0 0 1 {x0 + w},{y0 + e} L {x0 + w},{y0 + h - e} '
                              f'A {w / 2},{e} 0 0 1 {x0},{y0 + h - e} Z" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
            self.parts.append(f'<path d="M {x0},{y0 + e} A {w / 2},{e} 0 0 0 {x0 + w},{y0 + e}" fill="none" '
                              f'stroke="{stroke}" stroke-width="{sw}"/>')
        else:  # done / terminal / round
            self.parts.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="{h / 2}" fill="{fill}" '
                              f'stroke="{stroke}" stroke-width="{sw}"/>')

    def highlight_box(self, x0, y0, w, h, title):
        self.parts.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="6" fill="{BOX_FILL}" '
                          f'stroke="{NEW}" stroke-width="5"/>')
        if title:
            self.text(x0 + 14, y0 + 16, title, size=15, weight='bold', color=NEW_TITLE, anchor='start')

    def start_dot(self, cx, cy):
        self.parts.append(f'<circle cx="{cx}" cy="{cy}" r="10" fill="{INK}"/>')

    # ---- legend -----------------------------------------------------------------------------------------
    def legend(self, x, y, shapes, arrows):
        """shapes: list of (kind, text); arrows: list of (style, text)."""
        h = 50 + len(shapes) * 34 + len(arrows) * 22 + 10
        self.parts.append(f'<rect x="{x}" y="{y}" width="300" height="{h}" rx="6" fill="#ffffff" stroke="#bdbdbd"/>')
        self.text(x + 150, y + 18, 'Legend', size=15, weight='bold')
        for i, (kind, txt) in enumerate(shapes):
            yy, x0 = y + 50 + i * 34, x + 18
            self.shape(kind if kind != 'new' else 'claim', x0, yy - 11, 54, 22, new=(kind == 'new'))
            self.text(x0 + 70, yy, txt, size=15, anchor='start')
        base = y + 50 + len(shapes) * 34 + 2
        for i, (style, txt) in enumerate(arrows):
            yy, x0 = base + i * 22, x + 18
            self.path([(x0, yy), (x0 + 50, yy)], style)
            self.text(x0 + 70, yy, txt, size=15, anchor='start')
        return h

    # ---- output -----------------------------------------------------------------------------------------
    def write(self, path, width, height):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(width)}" height="{int(height)}" '
               f'viewBox="0 0 {int(width)} {int(height)}" font-family="{FONT}"><defs>'
               f'<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker>'
               f'<marker id="arrowNew" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{NEW}"/></marker>'
               f'<marker id="arrowDash" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{DASH}"/></marker>'
               f'</defs><rect width="{int(width)}" height="{int(height)}" fill="#ffffff"/>' + ''.join(self.parts) + '</svg>')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg)
