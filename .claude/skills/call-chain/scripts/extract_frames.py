#!/usr/bin/env python3
"""Extract the application frames and the exception cause chain from a Java stack trace.

Input can be a plain text file (a pasted stack trace or log line) or a Cloud Logging CSV
export (the `textPayload` column is used). Output is the call chain with the ENTRY POINT
FIRST (the reverse of a stack trace), proxy/interceptor noise removed, and the
"Caused by" chain with the ROOT CAUSE FIRST.

Usage:
  python extract_frames.py <file> [--prefix vn.nepnhaxudong] [--grep TEXT] [--row N]

  --prefix  package prefix of application frames (default: vn.nepnhaxudong)
  --grep    for CSV input: pick the first row whose textPayload contains TEXT
  --row     for CSV input: pick row N (0-based, after sorting by timestamp)
"""
import argparse
import csv
import re
import sys

csv.field_size_limit(10 ** 9)

FRAME_RE = re.compile(r"at\s+(?:[\w.$@/-]+//)?([\w.$]+)\.([\w$<>]+)\(([^)]*)\)")
CAUSE_RE = re.compile(r"^\s*Caused by:\s*(.+)$")

# Generated proxies and container plumbing: they add no information for a reader.
NOISE = ("$$$view", "$Proxy$", "WeldSubclass", "WeldClientProxy", "EnterpriseProxy",
         "$$super", "_$$_", "$$SpringCGLIB$$", "$$EnhancerBySpringCGLIB$$", "CglibAopProxy",
         "ReflectiveMethodInvocation")


def load_text(path, grep, row):
    if not path.lower().endswith(".csv"):
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    with open(path, encoding="utf-8", errors="replace") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("CSV has no rows")
    ts_col = next((c for c in rows[0] if c.strip("'\"") == "timestamp"), None)
    if ts_col:
        rows.sort(key=lambda r: r[ts_col])
    col = next((c for c in rows[0] if "textPayload" in c), None)
    if not col:
        sys.exit("CSV has no textPayload column")
    texts = [r[col].lstrip("'") for r in rows]
    if grep:
        texts = [t for t in texts if grep in t]
        if not texts:
            sys.exit("no row contains: " + grep)
        return texts[0]
    return texts[row]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--prefix", default="vn.nepnhaxudong")
    ap.add_argument("--grep")
    ap.add_argument("--row", type=int, default=0)
    a = ap.parse_args()

    text = load_text(a.file, a.grep, a.row)
    lines = text.splitlines()
    print("HEADLINE:", lines[0][:300] if lines else "")

    # Split into sections: the logged exception, then one per "Caused by".
    # Each section lists frames innermost first; a cause section is cut off with
    # "... N more" where it shares the outer frames with the section above it.
    sections, current = [], []
    for line in lines:
        if CAUSE_RE.match(line):
            sections.append(current)
            current = []
            continue
        m = FRAME_RE.search(line)
        if m:
            current.append(m.groups())
    sections.append(current)

    # Walk from the root cause outward: the root cause holds the deepest frames,
    # each enclosing section adds the outer frames the cause section left out.
    frames, seen = [], set()
    for section in reversed(sections):
        for cls, method, loc in section:
            if not cls.startswith(a.prefix) or any(n in cls + method for n in NOISE):
                continue
            key = (cls, method, loc)
            if key in seen:
                continue
            seen.add(key)
            frames.append((cls, method, loc))

    print("\nCALL CHAIN (entry point first):")
    for depth, (cls, method, loc) in enumerate(reversed(frames)):
        short = cls.rsplit(".", 1)[-1]
        line_no = loc.split(":")[-1] if ":" in loc else "?"
        print("  " * depth + "%s.%s :%s    [%s]" % (short, method, line_no, cls))

    causes = [CAUSE_RE.match(l).group(1) for l in lines if CAUSE_RE.match(l)]
    print("\nEXCEPTION CHAIN (root cause first):")
    for c in reversed(causes):
        print("  " + re.sub(r"@[0-9a-f]{6,}", "", c)[:220])
    print("  -> " + re.sub(r"\s+", " ", lines[0] if lines else "")[:200] + "   (logged line)")


if __name__ == "__main__":
    main()
