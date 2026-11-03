"""Exports an SVG to PNG with Microsoft Edge (or Chrome / Chromium) headless (no browser pane, no server).

Usage:  python render_png.py in.svg out.png [scale]      (scale = device pixels per SVG px, default 2.5)
"""
import os
import re
import subprocess
import sys
import tempfile
import time

EDGE_CANDIDATES = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
]


def main(svg_path, png_path, scale='2.5'):
    svg_path, png_path = os.path.abspath(svg_path), os.path.abspath(png_path)
    head = open(svg_path, encoding='utf-8').read(400)
    w = int(float(re.search(r'width="([\d.]+)"', head).group(1)))
    h = int(float(re.search(r'height="([\d.]+)"', head).group(1)))
    browser = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
    if not browser:
        raise SystemExit('Edge / Chrome not found; open the SVG in the browser pane and export from there instead')
    profile = tempfile.mkdtemp(prefix='svg2png-')
    url = 'file:///' + svg_path.replace('\\', '/')
    if os.path.exists(png_path):
        os.remove(png_path)
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--user-data-dir={profile}',
                    f'--force-device-scale-factor={scale}', f'--window-size={w},{h}', f'--screenshot={png_path}', url],
                   check=True, timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # the Edge launcher can return before its headless child has written the file
    deadline = time.time() + 60
    last = -1
    while time.time() < deadline:
        if os.path.exists(png_path):
            size = os.path.getsize(png_path)
            if size > 0 and size == last:
                break
            last = size
        time.sleep(1)
    if not os.path.exists(png_path):
        raise SystemExit('no PNG written')
    print(f'ok {png_path} ({w}x{h} at scale {scale})')


if __name__ == '__main__':
    main(*sys.argv[1:])
