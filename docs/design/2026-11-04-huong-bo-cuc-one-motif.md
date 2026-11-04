# Hướng bố cục: Một họa tiết (one-motif)

Chủ dự án chọn hướng này ngày 2026-11-04 (quyết định `docs/decisions/0009-taste-bo-cuc.md`). Bản dưới đây là bản thiết kế do `draw.mjs` của taste-skill 2.1.5 tạo ra, giữ nguyên tiếng Anh của công cụ. Lệnh tạo: `draw.mjs --sector physical-product --tone warm --have illustration,product-photo --keep palette,type --direction one-motif`, seed `1007694424`.

Họa tiết: chủ dự án chọn **hạt gạo nếp** (hình bầu dục tròn của hạt nếp cái hoa vàng), ngày 2026-11-04. Câu ý tưởng: "Trên trang này, hạt nếp cái hoa vàng của nhà trở thành khung ảnh, nút bấm, chấm đầu dòng và dải ngăn giữa trang." Các chỗ bản thiết kế mâu thuẫn với bộ nhận diện (mascot và hình minh họa là một phần của thương hiệu, trong khi bản này nói "do not draw illustrations") được ghi ở cuối file.

---

# DIRECTION SHEET — One motif
seed 1007694424 · drawn 2026-11-04 · sector physical-product · tone warm
Brief: A family's yellow-flower sticky rice from the Hải Dương countryside: rustic and warm but modern, a mascot of the mother in a nón lá, an illustrated field-to-table story, vacuum-packed 2 kg bags, contact by Zalo

| | |
| --- | --- |
| Direction | One motif |
| Hero | Striped card beside the room |
| Type | kept from the brand |
| Colour | kept from the brand |
| Sections | showcase (Object on a disc) → how-it-works (Accordion of tinted panels) → about (Inset panel, shaped portrait) → proof (Large marks on tiles) → gallery (One frame, contents change) → contact (Clip-out coupon form) → footer (The mark, built large) |
| Motion | Slow crossfade |
| Photographs | the "Field and farm" set, as atmosphere |

This is the direction for this build. Adopt it. Do not blend it with the layout you would have made anyway,
and do not redraw because it is unfamiliar: unfamiliar is the point. Redraw a slot only when it conflicts
with a stated brand constraint or needs an asset that does not exist, and say why in your report.

The parts of this sheet were written separately and will disagree in small ways. Settle every disagreement in this order:
**house rules** (including type no smaller than 13px and body text of 16px or more) → **the direction** (the idea, the composition habits, where the
one accent goes) → **the type system and the palette** (which face does which job, the five size steps, which colour is the ground and where the
accent goes) → **the hero blueprint** → **the section blueprints**. Under each blueprint below, "Adjusted for this page" lists where it disagrees.
In practice: take geometry from blueprints (columns, proportions, what sits where) and take everything else from above them. Map every size a
blueprint names onto one of your five type steps instead of adding a sixth. Use one button shape, one corner radius and one pair of page margins on
the whole page, whatever individual blueprints say. If a blueprint names a kind of typeface (a light serif, a heavy grotesk), use the dealt face.

## 1. The idea
Take one shape from the subject and let it run the whole system. A drilling tool's octagonal cross-section becomes the buttons, the image masks and the loader. A two-account money app becomes two circles that recur as icon, inline dot and section colour. A café's striped awning becomes every band on the page. Look at the product, the logo, the object or the word in the headline and find the simplest geometry in it (a circle, an arc, a chamfer, a stripe, a notch, a ring). Then use only that shape, at three or four very different scales, everywhere a designer would normally reach for a generic rounded rectangle.

Before anything else, write one sentence in your notes: "On this page, <the subject's own material> becomes <the device>."
Fill the first blank from your inventory of what only this client has (its name and what it means, its street, its numbers, its
constraint), then put the nearest competitor in the sentence: if it still works, the idea is the category's, not the client's.
Then name the one live thing the visitor can do on the page (SKILL.md step 4).

## 2. Composition
Hero: the motif appears once at enormous scale as a flat filled shape, cropped by the viewport (a circle 120vh across entering from the right, a chamfered block filling the lower half), with a short headline at 6–8vw and one supporting sentence set on the remaining ground, left-aligned on a shared margin. Through the page the motif returns as: the mask for every photograph (via `clip-path` or `border-radius` made from the same geometry), the shape of the primary button, the bullet beside list items at text size, and one full-width band that separates the two halves of the page. Sections use simple two-column or single-column layouts so the shape is the only thing with character.

## 3. Type
Kept from the brand. A clean geometric or grotesk face that echoes the shape (round bowls for circles, squared terminals for chamfers). Medium weight; headings 6–8vw in the hero and 3–4vw after.

## 4. Colour
Kept from the brand. The motif carries the accent colour at large scale, flat. Everything else is ground and ink. A second motif colour is allowed only if the subject has a real pair (two accounts, two modes).

## 5. Imagery
**Use the images that belong to the project in every picture slot.** For slots they cannot fill, real pictures of the subject's world from the open collections come next (start with `node C:/Users/lvdat/.claude/plugins/cache/taste-skill/taste-skill/2.1.5/skills/taste-skill/scripts/assets.mjs "sticky rice"`, then queries from your inventory (its street, its materials, its trade's tools and history); credit them on the page), then the dealt photographs.

Photographs appear inside the motif's shape. If there is product interface to show, it sits on a flat colour stage shaped by the motif. Draw the shape with CSS or a simple inline SVG path; do not draw illustrations.

**Floor (the inspector checks it):** at least four real pictures on the page, usually six to twelve; SVG drawings do not count. One moving picture where an honest clip exists: `node <skill>/scripts/assets.mjs --video "<query>"`, used as a muted loop with a poster frame. Whatever this direction says about pictures, it is carried out with real ones.

Photographs dealt for this build, from the "Field and farm" set (fields, grassland and rural land)
Order of preference for imagery: (1) the project's own photographs and product shots; (2) images you generate, if an image tool is
available; (3) real pictures of the subject's world found in the open collections (assets.mjs, downloaded and credited on the page);
(4) drawings of the subject in code; (5) these. They are real photographs (Unsplash licence, served by picsum.photos) of places, light and
texture. They are atmosphere, never a stand-in for a specific product, dish, person or interface. List the ones you use in your report so
they can be replaced.
- `https://picsum.photos/id/808/1600/1000` — Ploughed brown soil beside a green field under a pale sky · light tone · earth brown, grass green, off-white · calm area: top · native landscape · photo: elizabeth lies
- `https://picsum.photos/id/187/1600/1000` — Frost-covered field with dark hedgerows at first light · mid tone · frost grey, dark green, pale gold · calm area: centre · native landscape · photo: Andre Koch
- `https://picsum.photos/id/387/1600/1000` — Pale track winding through flat fields under a deep blue sky · mid tone · deep blue, tan, olive · calm area: top · native landscape · photo: Martin Dörsch
- `https://picsum.photos/id/337/1600/1000` — Golden wheat field beneath dark trees and a cloudy sky · mid tone · golden yellow, dark green, pale grey · calm area: top · native landscape · photo: Cornelia Büchse
- `https://picsum.photos/id/85/1600/1000` — Tractor pulling a trailer of hay bales across a golden field · mid tone · golden yellow, sky blue, white · calm area: top · native landscape · photo: Gozha Net
- `https://picsum.photos/id/915/1600/1000` — Rows of tea bushes covering a green plantation hillside · mid tone · tea green, dark green · native landscape · photo: McDobbie Hu
- `https://picsum.photos/id/107/1600/1000` — Close view of green wheat ears beneath a white sky · mid tone · fresh green, white · calm area: top · native landscape · photo: Lukas Schweizer
- `https://picsum.photos/id/542/1600/1000` — Flat green pasture beneath a heavy grey storm sky · mid tone · grass green, slate grey · calm area: top · native landscape · photo: Crucifix Jean-Luc
The last two path numbers are width and height: request the exact crop you render (`/1200/1500` for a 4:5 portrait, `/2400/1350` for a hero) and
add `?grayscale` to desaturate. Use three to six of them, not all eight. Always set `width`, `height`, `alt` and `loading="lazy"` (not on the hero image).
Other sets that fit this brief: interior-and-table, plants-and-flowers, hands-and-making, fog-and-quiet — `node draw.mjs --photos <set>` prints one in full; `--photos list` shows all sets. Taking photographs from another set is your call and is not a redraw; keep them to one light and one treatment.

## 6. Hero — Striped card beside the room
The viewport is split 50/50 with a 12px gap and 12px outer margins. The right half is one full-height photograph of the room, corners radiused 16px, `position: sticky` so it stays in view while the left half scrolls. The left half is a printed card: a flat paper-colour panel with the same 16px radius, and the subject's stripe (from its awning, label or ribbon) as the only ornament. Across the card's top runs a band 56px tall made of alternating bars of the single ink colour and paper, each bar 28px wide, built as a flex row of filled blocks. The same stripe returns as an 8px band above the footer and inside the button on hover. Under the band, centred: the wordmark about 300px wide, then a two-line headline in a light serif at clamp(40px, 3.6vw, 56px) in the ink colour, one supporting sentence at 17px held to 36ch, and the single action as a solid rectangular button. Three text links sit in one centred row at 15px, 28px above the card's bottom edge. One ink on paper; the photograph supplies every other colour.

On a phone: The photograph comes first at full width inside 12px margins, 48svh tall, with the 16px radius. The card follows and overlaps the photograph's bottom edge by 24px using a negative margin. Its striped band is 40px tall; below it the wordmark at 56% width, the headline at 8vw on two lines, the sentence and the button, all centred. The links wrap into the card's foot.
Headline: A warm two-line welcome of three to six words, up to about 18 characters per line at 3.6vw.

Adjusted for this page:
- It sets text at 12px: use your small step (13px or more) instead.
- It names its own corners: use the one radius of this page (square unless the direction says otherwise) and one button shape.
- It names a kind of typeface: use the brand faces.

## 7. Sections, in order
Each is a composition to rebuild with this project's content. Keep the geometry; change the subject. Re-order or drop a
section when the argument of the page needs it (see references/copy.md), never to fall back to a card grid.

### 1. showcase — Object on a disc (index)
One section about a viewport tall on a plain ground. A flat filled disc 64vh across, in one palette colour, sits with its centre at 58% of the width; swap the disc for the subject's own shape if it has one. A cut-out object photograph stands in front of it, centred on it, about 78% of the disc's height and breaking the disc's outline at the top. Bottom-left, starting on the margin and ending level with the disc's lower edge: a vertical list of four to six item names at clamp(28px, 2.9vw, 44px), leading 1.15. The selected name is in full ink and the rest at 25%; choosing a name swaps the object (300ms crossfade) and the disc's colour. The heading, two to four words at the same size as the names but in the soft ink, is the first line of that list. One fact about the selected item sits at the disc's right edge at 17px.
On a phone: The disc comes first, 86vw across and centred, with the object in front. The names follow as a single sideways-scrolling line at 26px with 24px gaps, the selected one in full ink. The fact sits under the names at 16px.

Adjusted for this page:
- It fades text: anything a visitor reads, inactive items of a list included, is `--ink` or `--muted` at full strength (contrast 4.5:1 or more). The active item is told apart by `--ink` against `--muted`, weight or the accent, not by fading the rest.

### 2. how-it-works — Accordion of tinted panels (strip)
A two-column introduction, then one horizontal accordion. Introduction: the heading, two to four words at clamp(36px, 4vw, 60px), in columns 1–5; one paragraph at 18px in columns 7–11. 64px below, a flex row across columns 1–12, 520px tall, of four to six panels with no gaps. The open stage is a panel taking about 58% of the width; the rest are vertical slivers sharing what remains. Order is carried by colour: the first stage is the darkest tone of one hue and each later stage is a lighter flat tint of it, so the row reads dark to light from left to right. A sliver shows only its stage name, rotated 90 degrees and reading upward, at 20px bold, anchored to its bottom-left. The open panel shows the name at 40px top-left, a 36ch paragraph at 18px bottom-left and, optionally, one photograph in its right half. Clicking a sliver opens it (flex-basis transition, 450ms).
On a phone: The accordion turns vertical: stages stack at full width as bars 64px tall in the same dark-to-light order, names set horizontally at 18px. The open stage expands to its content height with the paragraph at 17px. The first stage is open by default.

### 3. about — Inset panel, shaped portrait (split)
A deep-toned panel inset 20px from the page edges with a 12px radius, about 110svh tall, `overflow: hidden`. Left half: a two-line statement of four to seven words at clamp(40px, 4.4vw, 64px) in a pale ink, top-left with 56px padding; it is the heading and has nothing above it. Below it a photograph of the person or the workshop, masked with `clip-path` or an SVG `mask` to one bold shape taken from the subject (a four-lobed flower, a circle, an arch, a chamfered block), 38vw across, positioned so the panel's bottom edge crops its lowest fifth. Right side, starting at 63% of the width and 56px from the top: two text blocks 300px wide and 64px apart, each a subhead at 22px over a four-line paragraph at 15px; then one solid button in the accent colour. Between the statement and the text blocks the panel is empty. One photograph only.
On a phone: The panel is inset 10px and stacks: the statement at 8.5vw, then the two text blocks at full width, the button, and last the shaped photograph at 86vw across, centred and cropped by the panel's bottom edge by a quarter of its height.

Adjusted for this page:
- It names its own corners: use the one radius of this page (square unless the direction says otherwise) and one button shape.
- It sets a sentence large over several lines: jurors read that as a long headline. Either cut it to a two-line headline at display size, or keep it a statement at 36px or less on three lines (24px, four lines on a phone).

### 4. proof — Large marks on tiles (grid)
A board of filled tiles, four across and two or three rows deep, with 8px gaps, spanning the full content width. Each tile is about 3:2, one step lighter or darker than the page ground, with no border. A tile holds one supplied logo, shown far larger than a usual logo strip: about 72px tall, centred, in the page ink as a single-colour SVG. When no logo files exist, the tile holds the name instead, set at 28–32px bold, top-left with 24px padding; never draw a mark. One tile, twice the width of the others and placed first, is in the accent colour and carries the heading: two to four words at about 3vw, top-left. Tile corners follow the page's one radius, or the page's motif shape if it has one. Tiles sit still; there is no hover lift.
On a phone: Two tiles per row with 6px gaps, logos at 44px tall. The heading tile runs full width first, about 120px tall. Show eight tiles at most so the board stays under one and a half screens. Names set in type drop to 20px.

### 5. gallery — One frame, contents change (pinned)
Instead of many pictures side by side, one frame stays in place and its contents change. The frame is small and exact: 300px square on a quiet page, or up to 40vw at 4:5 on an object-led one, centred or sitting on the text column's left edge, with at least 20vh of empty ground above and below. Five to seven photographs are stacked inside it with `position: absolute` and crossfade in turn (opacity over 600ms, each held for 2.4 seconds, via CSS keyframes with staggered delays). All are shot or cropped alike: same scale, same light direction, the subject at the same position, so only the subject seems to change. On a flat ground use `mix-blend-mode: multiply` so studio backgrounds vanish. One caption line at 14px sits 16px below the frame and changes with the image. No arrows and no counter. On a motif-led page the frame takes the motif's shape through `clip-path`.
On a phone: The frame is 72vw wide, centred, in a section 70svh tall. The crossfade continues on its own; tapping the frame advances to the next image at once. The caption sits beneath, centred, at 14px. When reduced motion is requested the first image holds and tapping still advances.

### 6. contact — Clip-out coupon form (split)
The form is a coupon to cut out. One filled card in a strong flat colour, about 2.2:1, spans columns 2–11 with a 14px radius, with 120px of ground above and below. Semicircular notches 28px across are cut into its top and bottom edges at the 46% mark with `clip-path` or an SVG `mask`, and a vertical row of round dots (a dotted `border-left` 5px thick in the ground colour) joins the two notches as the perforation. Left of the perforation, with 48px padding: a two-line heading of three to five words at clamp(28px, 3vw, 44px) in heavy capitals at the top, and one sentence at 16px at the bottom. Right of it: four inputs stacked with 10px gaps, each a filled block 52px tall in a lighter tone of the card with its placeholder at 16px, then a full-width solid submit bar 56px tall in the darkest ink. Inputs keep visually hidden `label` elements.
On a phone: The card turns upright and spans the width with 12px margins. The perforation becomes horizontal: notches on the left and right edges, dots across. Heading and sentence sit above it; the four inputs and the submit bar sit below, each 54px tall.

Adjusted for this page:
- It names its own corners: use the one radius of this page (square unless the direction says otherwise) and one button shape.
- It names a kind of typeface: use the brand faces.
- It draws lines or borders: keep them only inside a table, a form or a `data-ui` fragment; elsewhere separate with space or a change of ground.

### 7. footer — The mark, built large (band)
On a flat colour field, the brand closes the page as a construction rather than as set type. Across the full content width and about 34svh tall, the wordmark is built from blocks: each letter is knocked out of its own solid rectangle in a palette colour, the rectangles differ in height (60–100% of the band) and butt together with 4px gaps, bottoms on one line. Where the project has a simple geometric mark or motif, enlarge that instead, drawn as inline SVG from flat rectangles, circles and quarter-arcs with the same 4px gaps. Below, 56px lower: four columns of plain links at 15px across columns 1–8, and two addresses or contact lines in columns 9–12. A last row carries the copyright at the left and one small filled button at the right. Space and the block construction do all the separating.
On a phone: The block wordmark spans the full width at about 22svh tall; a long name breaks into two rows of blocks. Link columns go two across at 15px, contact lines beneath at full width, then copyright and the small button on one row.

## 8. Motion — Slow crossfade
The principal photograph quietly changes: three or four images of the same framing crossfade over about 1.6 seconds, holding five to six seconds each, or the fixed image changes when its matching section arrives. It should feel like light shifting in a room. Pause when the tab is hidden; under reduced motion show only the first image.
This is the signature move, the one loud moment. Around it the page still needs the rest of the motion layer (SKILL.md step 9): an entrance for the parts of every section, feedback on every control, and one moving picture. The inspector fails a page that barely moves. Recipes: references/motion.md.

## 10. Where the richness comes from
One shape at many sizes. The giant cropped shape gives the hero mass and colour without a single image.

## 11. How this direction goes wrong
One motif means one. A circle here, a hexagon there and a blob behind is the generated look this replaces. The motif must come from the subject and you must be able to say from where in one clause.

## 12. Real references
Studied sites that work this way. Take the principle, never the specifics: no names, copy, images or signature assets of theirs.
- **Tara** (One Page Love, studied score 7.2) `opl-tara`
  Idea: Two pastel circles, mint for saving and pink for spending, stand for the app's two accounts and recur as icon, inline dot, section colour and card gradient.
  Hero: Off-white field with no navigation, only a small bold wordmark top-left. The left column is vertically centred and starts about 8% in: a two-line headline in a wide heavy grotesk at roughly 6vw with tight leading, a grey one-line subhead beneath, then a pill-shaped email field about 400px wide with a black pill button nested inside its right end. The right half holds a 3D pair floating on the page colour: a mint-to-pink gradient bank card tilted about 30 degrees, overlapping a perspective-tilted phone showing a balance screen. Two small award badges are stacked on the right edge. Roughly half the viewport is empty.
  Worth taking: Assign each product concept a colour and a shape early (two pastel circles), then reuse it as bullet, inline punctuation dot and full section background.
- **Superlocal 2026** (One Page Love, studied score 7.4) `opl-superlocal-2026`
  Idea: Everything is a circle: a dot-matrix logotype whose dots become floating photo circles and glowing orbs across a grey-to-orange field.
  Hero: Mid-grey field with a faint dot grid (one dot every 33px) that fades through the lower half into saturated orange at the bottom edge. The captured first paint contains one element: a 270×80px logotype dead centre, built from black ellipses of varying size, its letters progressively compressed to the right. No nav or text yet. After loading, a cluster of four small pills (one black, three white) appears top-centre; the logo turns white inside a 330px ring of about fifty tiny circles — round photo crops, glowing orbs, coins; and the bottom edge carries the event name left and dates right in an outlined dot-matrix face 40px tall.
  Worth taking: Build the logotype from a dot matrix of ellipses of varying size, then reuse the same matrix at screen-filling scale as the footer background.
- **starboy** (One Page Love, studied score 7.7) `opl-when-you-wish-upon-a-starboy`
  Idea: A tiny gadget shown enormous: product renders so large the screen crops them, wrapped around a nursery-rhyme headline in fat lowercase.
  Hero: No nav, logo or button. Off-white ground. The right half holds the headline: five stacked lines of very bold rounded lowercase at 13vw (187px), right-aligned and almost touching the right edge, with tight negative tracking and leading under 0.9, so the stack runs from 5% below the top to past the fold and the last line's descenders are cut off. The left 60% is one transparent-shelled, star-shaped device rendered at huge scale (yellow circuit board, round black screen), rotated and cropped by the top, left and bottom edges, its right-hand points tucking behind the letters. A chrome keyring loop peeks in at bottom-right.
  Worth taking: Scale the product until two or three viewport edges crop it, and let its silhouette tuck behind the headline letters.
Full notes on any of them: `node draw.mjs --site <id>`.

## Always
Headlines two lines or fewer at every width. No eyebrow labels, no monospace, no 01/02/03, no thin rules, no gradients, no shadows at rest,
no cream-and-terracotta, no violet. The frame: one h1 on the first screen that says what this is, equal outer margins, no
section huddled on one side with the other half empty, no blank stretch over half a screen, a heading on every section.
`inspect.mjs` measures all of it.


---

## Chỗ mâu thuẫn với bộ nhận diện (ghi chú của dự án)

- Bản thiết kế muốn ít nhất 4 ảnh thật và nói không vẽ hình minh họa. Mascot, nền đồng lúa và câu chuyện từ đồng tới mâm cơm là hình vẽ đã được duyệt, nên vẫn giữ. Ảnh thật thêm vào khi gia đình có ảnh.
- Ảnh picsum.photos mà công cụ đưa ra là đồng ruộng ở nước ngoài, không phải ruộng lúa Việt Nam. Không dùng; nếu cần ảnh tạm thì tìm bằng `assets.mjs` (ảnh có giấy phép mở, ghi nguồn).
- Phần hero "Striped card beside the room" cần một ảnh lớn bên phải; ở Nếp Nhà chỗ đó là mascot và cảnh đồng lúa đang vẽ ở nhánh `feat/canh-minh-hoa`.
