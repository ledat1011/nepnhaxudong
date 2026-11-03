# Render & Visual QA (Windows, WPS Office)

No PowerPoint or LibreOffice on this machine. Render through **WPS Office COM** → PDF → images, then **look at every slide**.

## 1. Export the .pptx to PDF via WPS (PowerShell)

```powershell
$pptx = "<abs>\Deck.pptx"
$pdf  = "<abs>\Deck.pdf"
if (Test-Path $pdf) { Remove-Item $pdf -Force }
$app = New-Object -ComObject kwpp.Application      # WPS Presentation
try { $app.Visible = $true } catch {}
$pres = $app.Presentations.Open($pptx)
$pres.SaveAs($pdf, 32)                              # 32 = ppSaveAsPDF
$pres.Close(); $app.Quit()
if (Test-Path $pdf) { "PDF_OK " + (Get-Item $pdf).Length } else { "PDF_MISSING" }
```

Notes:
- ProgID is `kwpp.Application` (Presentation). Writer = `kwps.Application`, Sheets = `ket.Application`.
- Don't use `$PID` as a loop var in PowerShell — it's read-only. Use `$prog`.
- WPS renders Arial/Calibri true-to-width, so overflow you see is real.

## 2. Rasterize the PDF (Python / PyMuPDF)

```python
import fitz
d = fitz.open("Deck.pdf"); m = fitz.Matrix(1.5, 1.5)
for i, pg in enumerate(d, 1):
    pg.get_pixmap(matrix=m).save(f"r-{i:02d}.png")
```

(For an **image-only** source PDF you're trying to read, the same `get_pixmap` works — text extraction via pypdf returns empty.)

## 3. Inspect every slide image

Read each `r-NN.png` and check for: text overflow / cut-off, overlapping elements, low-contrast text or icons, chrome (kicker/locator/rule) mispositioned after edits, uneven gaps, placeholders left in. Fix in the build script, **re-run build + re-export PDF**, then re-check only changed slides. Stop after one fix-and-verify cycle unless a new user-visible defect appears.

## Animations (slide transitions)

pptxgenjs has no animation API — inject OOXML after `rezip`. Fade transition on every slide (low-risk, eye-catching). Re-export the PDF afterward only to confirm the file isn't corrupted (transitions don't show in a static render).

```python
import zipfile, re, os, shutil
src = "Deck.pptx"; tmp = "anim.pptx"
TRANS = '<p:transition spd="med" p14:dur="500" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"><p:fade/></p:transition>'
zin = zipfile.ZipFile(src); out = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
for n in zin.namelist():
    d = zin.read(n)
    if re.match(r"ppt/slides/slide\d+\.xml$", n):
        x = d.decode("utf-8")
        if "<p:transition" not in x:
            x = x.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + TRANS, 1) if "</p:clrMapOvr>" in x \
                else x.replace("</p:cSld>", "</p:cSld>" + TRANS, 1)   # schema order: cSld, clrMapOvr, transition, timing
        d = x.encode("utf-8")
    out.writestr(n, d)
out.close(); zin.close(); os.replace(tmp, src)
```

Per-element entrance animations need a `<p:timing>` block with shape IDs — fragile to hand-author and unverifiable in a static render; tell the user to add those in WPS/PowerPoint with two clicks unless they insist.

## 4. Structural pre-check (optional, no render needed)

```python
from pptx import Presentation
from pptx.util import Emu
p = Presentation("Deck.pptx")
for i, s in enumerate(p.slides, 1):
    for sh in s.shapes:
        if not getattr(sh, "has_text_frame", False): continue
        l, t = Emu(sh.left).inches, Emu(sh.top).inches
        r, b = l + Emu(sh.width).inches, t + Emu(sh.height).inches
        if l < -0.02 or t < -0.02 or r > 13.35 or b > 7.52:
            print("OOB", i, sh.text_frame.text[:40])
```
