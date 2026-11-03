---
name: "停播之后：零号频道"
description: "废弃地方电视台里只剩一名观众在线的全视口互动直播终端"
colors:
  coal-black: "#080907"
  broadcast-black: "#11130f"
  paper-ink: "#e8e1cf"
  faded-copy: "#aaa793"
  warning-red: "#b8342f"
  live-red: "#e14a3d"
  phosphor-green: "#9eaf8a"
  terminal-panel: "rgba(16, 18, 14, 0.92)"
  hairline: "rgba(224, 218, 193, 0.25)"
  civic-blue: "#2c6a86"
  civic-blue-deep: "#24586f"
  civic-paper: "#ffffff"
  civic-soft: "#f2f6f7"
  civic-line: "#d4dde7"
typography:
  display:
    fontFamily: "\"LXGW WenKai\", serif"
    fontSize: "clamp(44px, 7.2vw, 104px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.08em"
  title:
    fontFamily: "\"LXGW WenKai\", serif"
    fontSize: "clamp(17px, 1.65vw, 25px)"
    fontWeight: 600
    letterSpacing: "0.08em"
  narrative:
    fontFamily: "\"LXGW WenKai\", serif"
    fontSize: "clamp(15px, 1.38vw, 21px)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "\"Microsoft YaHei\", \"PingFang SC\", sans-serif"
    fontSize: "clamp(12px, 1vw, 15px)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "\"Microsoft YaHei\", \"PingFang SC\", sans-serif"
    fontSize: "clamp(10px, 0.8vw, 12px)"
    fontWeight: 400
    letterSpacing: "0.08em"
rounded:
  square: "0px"
  signal: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
components:
  primary-action:
    backgroundColor: "rgba(232, 225, 207, 0.04)"
    textColor: "{colors.paper-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 18px 0 24px"
    height: "52px"
  send-button:
    backgroundColor: "#9f352f"
    textColor: "#f6e7df"
    rounded: "{rounded.square}"
    width: "78px"
    height: "42px"
  comment-input:
    backgroundColor: "rgba(2, 3, 2, 0.46)"
    textColor: "#f4ecd5"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "42px"
  forum-restart:
    backgroundColor: "#f8fafb"
    textColor: "{colors.civic-blue-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 18px 0 24px"
    height: "52px"
---

# Design System: 停播之后：零号频道

## Overview

**Creative North Star: "最后在线的应急播出终端"**

The interface behaves as equipment left running inside an abandoned local television station, not as a modern streaming product. Live imagery remains the dominant material; identity, status, comments, subtitles, and interaction controls are sparse broadcast annotations laid directly over it.

The atmosphere is coal-dark, low-saturation, quiet, and operational. Faded green suggests aging phosphor and institutional equipment, while warning red is reserved for live, send, progress, and fault-bearing signals. Controls resemble old subtitle-machine fields and signal markings through square corners, hairline borders, compact labels, and restrained movement.

**Key Characteristics:**
- Full-viewport 16:9 live image with no conventional player chrome.
- Square, low-gloss controls anchored to the broadcast edges.
- WenKai narrative voice paired with compact system sans-serif telemetry.
- Phosphor green for station identity and warning red for consequential state.
- Scanlines, edge falloff, and deep overlays integrated with the footage.

## Colors

The palette combines coal-black broadcast surfaces, warm paper-colored text, faded phosphor green, and rare warning red.

### Primary
- **Warning Red:** Consequential broadcast state: live lamp, send action, chapter progress, generation progress, and system emphasis.
- **Live Red:** The brighter signal reserved for the breathing live indicator and urgent system accents.

### Secondary
- **Faded Phosphor:** Station marks, names, subtitle speakers, and aged-equipment cues.
- **Civic Blue:** Qinghe Local Board mastheads and navigation, keeping the forum legible as an ordinary municipal web surface.
- **Deep Civic Blue:** Forum identity, authored reply attribution, and the ending restart action.

### Neutral
- **Coal Black:** The outer viewport and darkest environmental ground.
- **Broadcast Black:** The live frame fallback and unlit signal surface.
- **Paper Ink:** Primary controls, headings, and high-priority copy.
- **Faded Copy:** Supporting instructions, placeholders, and quiet status text.
- **Terminal Panel:** Dense interaction surfaces over moving imagery.
- **Hairline:** Dividers and field borders that organize the terminal without becoming cards.
- **Civic Paper:** The white Local Board page ground that separates public-web evidence from the dark broadcast.
- **Civic Soft:** The current player's automatically synchronized reply row.
- **Civic Line:** Attachment, thread, and forum-container boundaries.

### Named Rules

**The Signal Rarity Rule.** Warning red communicates a live, transmitting, progressing, or failed system state; it is never general decoration.

**The Image Owns the Screen Rule.** Overlay colors must preserve the live image as the first-read surface, using falloff and localized panels only where legibility requires them.

## Typography

**Display Font:** LXGW WenKai (self-hosted, with serif fallback)  
**Body Font:** Microsoft YaHei (with PingFang SC and sans-serif fallbacks)  
**Label Font:** Microsoft YaHei (with PingFang SC and sans-serif fallbacks)

**Character:** WenKai gives titles, prompts, and Lin Lan's returned speech a human, pencil-adjacent voice. The system sans-serif carries telemetry, comments, controls, and status with compact broadcast clarity.

### Hierarchy
- **Display:** Regular WenKai with a tight line box and widely tracked characters; used only for entry and completion titles.
- **Title:** Semibold WenKai with moderate tracking; used for the channel name.
- **Narrative:** Regular WenKai with an open line-height; used for interaction prompts and returned dialogue.
- **Body:** Regular system sans-serif with a readable line-height; used for chat and supporting interface copy.
- **Label:** Small, tracked system sans-serif with tabular numerals where data changes; used for viewer count, connection state, speaker labels, and progress copy.

### Named Rules

**The Two Voices Rule.** WenKai belongs to the broadcast's human and narrative voice; sans-serif belongs to the terminal, audience, and controls.

**The No Kicker Rule.** Do not place ornamental eyebrow text above titles; identity and state labels must perform an actual broadcast function.

## Layout

The root surface centers a 16:9 broadcast frame sized by the limiting viewport dimension. The frame fills the available view on matching landscape screens and remains isolated against coal black elsewhere; content does not scroll.

The live layer stack is footage, edge falloff, scanlines, then interface. The top edge holds channel identity and follow state at left, with telemetry plus sound at right. Comments occupy the lower-left safe area above the dock; like and gift controls form a narrow right action rail. Runtime subtitles center near the lower image area. The interaction dock is centered above the bottom edge rather than spanning the viewport: it caps at 1180px, keeps fluid side margins, and uses a compact two-column grid with narrative context in the narrower left column and hints, field, and state in the wider right column.

At the second-act verification point, an upward swipe on the bottom Home Indicator leaves the livestream and reveals the player's familiar iOS-like landscape phone surface. This is intentionally a separate visual world from the abandoned broadcast: a dark rose wallpaper, system status bar, oversized clock, live activity widget, rounded app icons and a translucent Dock make it immediately legible as the player's own device. The fictional VEIL browser opens with recognizable browser chrome and the fictional Northstar search page; a matching query produces ordinary search results before the player opens a realistically structured public-information website. The website content scrolls inside VEIL rather than moving the outer frame.

The E3 conclusion returns to that same VEIL Browser and Qinghe Local Board world instead of introducing a new ending panel. Inside the dense thread, the authored 16:9 control-room image spans the post column as the first read, followed by one softly tinted automatic reply carrying the current player's name and a compact footer with the restart action. At compact width or height, post identity columns collapse above their content, the image caption stacks, and the footer places its full-width action below the closing status.

Spacing is fluid at large sizes through clamped side margins, compact dock padding, and restrained gaps. At widths below 820px or heights below 540px, the dock becomes near-full-width (`calc(100% - 24px)`), collapses to a stacked single-column layout, and contracts the comment field from 42px to 38px. The prompt, hint controls, and attached live-image evidence remain visible; secondary station and viewer-count labels hide, while chat and social actions tighten against the two lower corners. The video remains primary throughout.

**The Edge-Anchored Rule.** Reusable broadcast information attaches to the top, right safe area, or bottom edge; avoid floating task cards in the center of live footage.

## Elevation & Depth

Depth is structural rather than glossy. The broadcast frame uses one deep ambient shadow against the outer black field; the bottom dock uses an upward shadow to separate controls from footage. Text over image receives black legibility shadows, while scanlines and directional falloff age and bind the layers together. Panels do not use stacked card elevation.

### Shadow Vocabulary
- **Frame Isolation** (`0 28px 80px rgba(0, 0, 0, 0.55)`): Separates the fixed-ratio broadcast from the outer viewport.
- **Dock Separation** (`0 -12px 34px rgba(0, 0, 0, 0.3)`): Gives the compact interaction dock a restrained lift from moving footage.
- **Overlay Legibility** (`0 2px 12px #000`): Keeps compact identity and telemetry readable over video.

**The Structural Shadow Rule.** Shadows separate equipment layers or restore text legibility; they do not make controls look glossy or card-like.

## Shapes

The form language is rectilinear and equipment-like. Buttons, fields, subtitles, docks, and progress tracks use square corners. Fine one-pixel borders and three-pixel or two-pixel tracks carry structure without decorative containers. Circles are limited to the live lamp and compact numeric attention markers; inline stroke icons remain geometric and unfilled.

**The Square Console Rule.** Broadcast controls use square corners; circles are reserved for signal lamps and compact numeric attention markers. The simulated personal phone is the explicit exception and follows familiar iOS corner radii so players can distinguish their device from Channel Zero at a glance.

## Components

Components behave like parts of one broadcast console: compact, tactile, and subordinate to footage.

### Buttons
- **Primary Action:** A 52px-high outlined rectangular control with asymmetric horizontal padding, generous label-to-arrow separation, faint paper-tint fill, and no radius. Hover strengthens the border and fill and lifts the control by 2px.
- **Send:** A fixed-width phosphor keycap (`发送 ↵`) seated inside the right end of the terminal command line, with a light bevel and soft LCD glow. Disabled state drops to a dark key with dim phosphor text and removes the active cursor.
- **Suggestion / Recovery:** The hint toggle and recovery actions are small old-computer dialog keys (dark fill, one-pixel phosphor border, black outer stroke, square `?` cap); suggestions are dashed terminal options prefixed with `›`. Both remain quieter than send and primary actions.
- **Focus:** Buttons use a two-pixel warm paper outline offset by three pixels.

### Inputs / Fields
- **Comment Field:** A 40px-high near-black terminal command line: one-pixel phosphor border around the whole row, a glowing `>` prompt, LCD-colored typed text and caret, dim phosphor placeholder, and the send key embedded at the right. Focus brightens the border and adds a faint outer glow.
- **Focus:** Buttons inside the dock use a two-pixel bright phosphor outline offset by two pixels.
- **Responsive:** Height contracts to 36px in compact landscape layouts.

### Cards / Containers
- **Interaction Dock (Relay Terminal):** A centered bottom terminal window capped at 1180px that reuses the cover menu's LCD phosphor language (`#c7cfb1` / `#e3edcf`, scanlines, square corners, Consolas telemetry). Structure follows an old computer dialog box: a full-width title bar (`弹幕回传 · RELAY · CH-00` plus a live state readout — `RX 等待输入`, `TX 回传中`, `RETRY 信号不清`, `LINK FAULT 线路中断` — whose circular lamp breathes phosphor, blinks red while transmitting, turns amber on retry and holds red on fault); a small signal-monitor window in the portrait slot with a scrolling oscilloscope trace (static on fault); the `【 零号频道 】` speaker line and WenKai prompt ending in a blinking `▶`; and a right console column with hint keys, the command line and state strips. Styles live in `src/relayTerminal.css`. Compact landscape becomes a near-full-width single column, hides the monitor and title-bar code, and keeps the prompt, hints and evidence. When the phone exit gesture is available, the dock lifts to 34px so the Home Indicator hint never covers the input.
- **Runtime Dialogue:** Current prototype playback relies on H3-native synchronized speech only; no frontend character-name or dialogue plate is rendered over Runtime footage.
- **State Strips:** Generation progress (a segmented phosphor bar with a blinking underscore caret) and failures occupy the dock's console column rather than opening detached cards or dialogs.
- **Phone Surface:** A full-frame iOS-like personal layer with wallpaper, status bar, clock, live activity widget, app icons, notification and Dock. Opening it removes underlying livestream controls from the interaction tree while the feed continues. The third-act version adds Recent Streams, a numeric dialer, an old-line voicemail player and evidence return without changing the phone's established visual language.
- **VEIL Browser Surface:** Dark landscape browser chrome over the white Northstar search page. Search is staged as query → result list → archived page, preserving the feeling of investigating rather than receiving a preselected clue. No real browser or search-engine brand is shown.
- **Archive Website:** VEIL remains a contemporary iOS-like shell while each result page adopts the information architecture of a believable independent website: organization masthead, restrained navigation, breadcrumb, category rail, publication metadata, dense article hierarchy, records and footer. Qinghe public-information pages use clean white and desaturated civic blue rather than retro terminal styling. Unease comes from factual anomalies—impossible timestamps, missing source fields, unexpected live-connection counts—not horror fonts, damaged layouts or decorative glitches.
- **Evidence Attachment:** A compact phosphor line inside the interaction copy confirms the selected record before the player submits the prepared comment.

### Qinghe Local Board Conclusion
- **Thread Shell:** Reuse the white Qinghe Local Board masthead, desaturated blue navigation, narrow centered page, and dense two-column post/reply rows inside the existing dark VEIL Browser chrome.
- **Authored Ending Image:** Present the powered-off control-room image at a fixed 16:9 ratio across the post content column. Darken and desaturate it slightly, then add restrained edge falloff; the image remains the first read and its source anomaly stays in the caption.
- **Automatic Player Reply:** Follow the authored image with one softly blue-tinted reply row. The player's current display name appears in deep civic blue; the uncanny sentence uses larger WenKai, while synchronization metadata remains small system sans-serif.
- **Restart:** Keep restart available in the thread footer as the existing primary action recolored for the civic surface. It sits beside the closing connection status on wide layouts and becomes a full-width action below it in compact layouts.
- **Ending Isolation:** E3 uses this forum conclusion after its authored videos; E1 keeps its existing completion panel.

### Navigation
- There is no route or chapter navigation chrome. A three-pixel bottom track communicates authored-sequence progress without behaving like a seek bar. The session begins on a full-screen game cover with the development entrance still available, then moves into the same VEIL browser later used for investigation: a Qinghe local forum, a public-information notice, a night photograph, and an unidentified temporary livestream join form. At `INT-A2-01` and `INT-A3-01/02`, the iOS Home Indicator accepts an upward touch or pointer drag to leave the livestream. Tapping the live widget or Channel Zero Dock icon returns to the feed; VEIL's back control returns to the desktop. Third-act failed searches can route to Recent Streams, then back to VEIL with the original query and attempt count preserved.

### Livestream Header
- Channel identity pairs the circular breathing live lamp with WenKai station naming. Right-aligned telemetry uses tracked sans-serif labels, tabular numerals, hairline separators, and one transparent sound icon button.
- The header does not capture pointer input except at the sound control.

### Chat Stream
- Up to ten recent messages stack in the lower-left safe area. Early-act audience comments arrive continuously at a varied cadence and push the stack upward; the ambient stream stops when the story reduces the audience to one.
- Author names use faded phosphor; player and gift messages shift to warm cream and gold; system messages shift to muted red. Localized dark strips and strong text shadows preserve legibility over footage.
- Follow sits beside channel identity. Like and gift remain in the right action rail; likes release a short vertical heart burst, while follow and gift actions produce both a compact toast and an in-stream record.

### Motion & State
- The live lamp breathes over 1.8s. The comment stack rises in one short grouped movement whenever a message arrives. Likes float upward from their source; follow and gift confirmation uses one compact clipped toast. The interaction dock reveals vertically over 620ms, while progress changes ease over 700–900ms.
- The OCR notice enters once from the right. It identifies a location term and an equipment-number term without explicitly instructing the player what to search. VEIL offers to paste the two captured text fragments; a failed query only advises combining location and device information. Sending the maintenance record closes VEIL, attaches `BREAKER_MAP`, prepares the C-04 instruction and returns focus to the livestream.
- Search results use realistic URL, section and snippet hierarchy. Archive pages keep normal website behavior and density even when their content becomes uncanny; anomalous details remain discoverable on a second read instead of interrupting the page with a horror effect.
- The PRE-A1-04 disconnect sequence removes comments in three timed stages rather than clearing the stack instantly. Each stage briefly increases scan noise, horizontal signal tearing, restrained red/cyan separation, irregular luminance flicker and isolated black-frame pulses; the interference ends with the shot and never obscures interaction controls.
- PRE-A1-02+03 and PRE-A1-05 each receive one guaranteed two-to-three-second fault burst so the disconnect has a visual lead-in and aftershock. Later eligible footage may receive the same burst at irregular intervals, while username records and other reading-critical shots remain stable.
- A fault burst follows a 2.4-second tape-error phrase: dark-to-bright onset, then three isolated heavy hits around 0.67s, 1.46s and 2.04s. Each hit combines blocky horizontal slices, brief displacement, luminance snap and RGB separation; the image settles between hits instead of shaking continuously.
- Motion uses `cubic-bezier(0.16, 1, 0.3, 1)` for staged reveals and progress. Basic control hover uses a short 220ms ease.
- Reduced-motion preference collapses animations and transitions to effectively immediate state changes.

### Narrative Blueprint Workspace
- **Creative North Star: "仍在运行的播出线路蓝图"。** `/narrative.html` is a local authoring instrument for writers and developers, not an in-fiction player surface. It translates the abandoned-station world into a dense, measurable control workspace: deep blue-black equipment fields, cool blue-gray graph structure, sparse cyan and amber signals, square shells, hairline rules, and compact telemetry.
- **Palette Strategy:** The workspace uses coal-blue black grounds (`#080b0d`, `#0d1216`, `#121a20`) and cool structural lines (`#27343c`, `#43525a`). Cool cyan (`#60a7b2`) marks story structure and focus; softer cyan (`#79bbc4`) marks evidence; amber (`#d69a3f`, `#edbb64`) marks interaction, linking, selection, and keyboard focus; red (`#b94a43`) is reserved for endings and destructive actions. Muted gray-green (`#8f968f`) carries secondary telemetry. These are scoped authoring colors and do not replace the livestream palette.
- **Typography:** Microsoft YaHei with PingFang SC and sans-serif fallbacks carries controls, labels, node copy, IDs, counts, and editable fields. LXGW WenKai is limited to the 17px workspace title, 15px node titles, and the evidence stamp. The observed ramp is intentionally compact: 8–9px metadata, 10–11px controls and body copy, 12px inspector titles, 15px node titles, and 17px workspace identity. Tracked labels use approximately `0.05em–0.13em`; changing numeric telemetry uses tabular numerals.
- **Desktop Topology:** Above 1050px, use a 58px top equipment bar over a full-height three-column workspace: 226px chapter index, flexible graph canvas, and 320px inspector. The top bar itself separates a 280px identity block, fluid save status, and file actions. The canvas—not a card—is the primary surface.
- **Intermediate Layout:** At 1050px and below, keep a 200px chapter rail beside the canvas and move the inspector into a 260px lower work area. File actions detach into a 40px-high strip at the upper right; inspector fields form three columns to preserve editing density.
- **Compact Layout:** Below 700px, use a 48px top bar, keep the graph primary with at least 300px height, and place a 276px inspector below it. Hide the permanent chapter rail and replace it with the 118px chapter selector inside the canvas toolbar. File labels disappear but all five actions remain as 36px icon controls.
- **Canvas:** The world is a 4000×2400 coordinate field over a two-scale measurement grid: 20px minor lines and 80px major lines. Nodes snap to 10px while dragging and new nodes originate on 20px increments. Blank-canvas drag pans; the wheel zooms around the pointer from 30% to 145%; toolbar controls zoom, fit all nodes, and expose linking state.
- **Node Anatomy:** Every node is a fixed 300×174px square panel with a one-pixel shell, a three-pixel semantic top signal, a 31px metadata header, clipped title and copy, optional bottom note, and explicit 14px circular input/output ports. Hover and selection strengthen border and ground rather than adding elevation.
- **Node Semantics:** Story nodes use cyan plus the visible `剧情` label. Interaction nodes use amber, the `交互` label, and a dashed shell. Evidence nodes use softer cyan, a three-pixel double shell, the `证据` label, and a visible square `证` stamp. Ending nodes use red, the `结局` label, and a dark red-tinted ground. Color is never the only distinction.
- **Connections:** Directed relationships are one-and-a-half-pixel blue-gray cubic bezier lines with arrowheads and a 16px transparent hit area. Selection changes the visible line to 2.5px amber. Conditions sit directly on the path with a canvas-colored text stroke for legibility; ports arm in amber during linking.
- **Chapter Navigation:** The desktop chapter index is a dense list with chapter label, title, and tabular node count. Active chapters gain a hairline border, raised blue-black ground, and one amber leading rule. Chapter flags repeat the chapter label directly in world space so the graph remains navigable after panning.
- **Inspector and Fields:** The inspector edits node title, stable ID, type, chapter, narrative content, production notes, and X/Y coordinates in place. Inputs are 34px-high, square, near-black fields with one-pixel blue-gray borders; textareas begin at 86px and resize vertically. Cyan border focus identifies field editing, while the global two-pixel amber outline preserves keyboard visibility. Edge conditions edit independently; deleting an edge keeps both nodes, while deleting a node removes attached lines.
- **File and State Controls:** The top equipment bar exposes add, explicit save, JSON export, JSON import, and reset. Neutral actions remain transparent until hover; reset receives a restrained red hover. Save state, node count, and edge count remain visible on desktop. Inline SVG stroke icons are the canonical icon form.
- **Persistence:** Node and edge changes auto-save to `localStorage` after 450ms under the blueprint's versioned key. `Ctrl/Cmd+S` saves immediately. Export produces formatted JSON; import accepts JSON containing node and edge arrays; reset requires confirmation and restores the built-in graph. These authoring changes do not mutate the runtime state machine automatically.
- **Depth and Motion:** The workspace is flat and structurally layered through adjacent grounds, sticky regions, borders, and the grid; it does not use card shadows. Basic hover and selection transitions run at 130–160ms ease. Only the 6px green saved-status lamp pulses, over 2.4s. Reduced-motion preference collapses all animation and transition durations.

**The Canvas Owns the Workspace Rule.** Keep the graph as the dominant authoring surface at every width; navigation and inspection may relocate, but must not cover it with modal workflows.

**The Redundancy Before Color Rule.** Every node type must retain its text label and structural marker in addition to hue.

**The Blueprint Is Not the Broadcast Rule.** Reuse the game's square equipment language and two-font hierarchy, but keep authoring cyan, amber, grid lines, and dense editing controls scoped to this workspace.

## Do's and Don'ts

### Do:
- **Do** preserve the live image as the first viewport and anchor interaction to its bottom edge.
- **Do** use warning red only when a broadcast action or state has consequence.
- **Do** keep waiting, generation, failure, and recovery language inside the fiction of a relay signal.
- **Do** maintain strong text shadows or localized dark backing where copy crosses moving footage.
- **Do** keep self-hosted WenKai for display and narrative roles and system sans-serif for terminal roles.

### Don't:
- **Don't** add conventional playback controls, seek handles, task cards, modal dialogs, or dashboard navigation.
- **Don't** round console fields and panels or apply glossy, soft-card styling.
- **Don't** add decorative eyebrows, badges, or labels that do not communicate station identity or live state.
- **Don't** use warning red as ambient decoration or let overlays compete with the footage.
- **Don't** introduce anime, cel-shaded, glossy 3D, or arbitrary third-person visual language into the broadcast surface.
