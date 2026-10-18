# 호그와트 탐험 — Art assets

Night-time castle sneaking game, top-down pixel art. **Same spec as dot town** (`/workspace/dotgame/docs/ART_SPEC.md`):
16x16 tiles, 16x32 character frames, 64x128 walk sheets, rows **down / left / right / up**, columns
**standing / stepA / standing / stepB** (8 fps loop), transparent PNG, the same auto outline `#2a1d24`,
the same 2-tone shading and 2px ground shadow. Only the palette changes: a night palette (cool dark stone,
deep blue/purple) with warm orange torch and lantern light.

Every design is an original pixel design. Nothing is traced or copied from film stills, book illustrations or
actor likenesses. Harry is an original pixel interpretation of the book character's description:
messy black hair, round glasses, a Gryffindor-style black robe with a red/gold scarf, and a 1px scar mark.

Scripts (re-runnable; they import the dot town engine from `/workspace/dotgame/tools/heroine_art/` read-only):
`/workspace/hogwarts/tools/art/chars.py`, `tiles.py`, `preview.py`.

## Characters (`characters/`)

| File | Size | Frames | Notes |
|---|---|---|---|
| `characters/harry_walk.png` | 64x128 | 4x4 of 16x32; rows down/left/right/up; cols stand/stepA/stand/stepB | Player. Collision box suggestion: bottom 16x10 (feet). |
| `characters/filch_walk.png` | 64x128 | same as above | Caretaker NPC (patrols). Hunched; lantern held to the side, so use the lantern as a light source (~3 tiles of warm light). |
| `characters/mrs_norris_walk.png` | **64x64** | **4x4 of 16x16**; rows down/left/right/up; cols stand/stepA/stand/stepB | Cat NPC. Deviates from the 16x32 frame size on purpose: a cat is a 1-tile creature. Shadow is at y15. Left row = mirrored right row. |

## Tiles (`tiles/`, 16x16 each)

| File | Walkable? | Description |
|---|---|---|
| `tiles/floor.png` | walkable | Stone flagstone floor (tiles seamlessly) |
| `tiles/floor_b.png` | walkable | Floor variant with a cracked slab and pebbles (scatter ~10%) |
| `tiles/wall_top.png` | blocking | Wall top seen from above, with a lit front rim. Place above wall-face rows. |
| `tiles/wall_face.png` | blocking | Brick wall front face |
| `tiles/door_closed.png` | blocking (interactable) | Arched wooden door with iron bands and a ring pull, set in a wall face |
| `tiles/door_open.png` | walkable | The same door, open (dark doorway) |
| `tiles/stairs.png` | walkable (trigger) | Stairs going up/north. Stack vertically; use as a floor-change trigger. |
| `tiles/torch_0.png`, `tiles/torch_1.png` | blocking (wall) | Wall torch on a wall face, 2 flicker frames |
| `tiles/torch_strip.png` | 32x16 | Both torch frames side by side (frame 0, frame 1). Suggest ~4 fps flicker. |
| `tiles/painting.png` | blocking (wall) | Gold-framed painting (original moonlit-hills scene) on a wall face |
| `tiles/tapestry.png` | blocking (wall) | Purple tapestry with an original gold star / silver moon motif and fringe. Could hide a passage. |
| `tiles/passage_marker.png` | blocking until revealed | Secret passage marker: a faint blue glowing crack and rune on a wall face. Swap to `door_open` or `floor` when it opens. |
| `tiles/bookshelf.png` | blocking, opaque | Library bookshelf (map char `B`, game name `bookshelf`). 16x16, fills the tile. |
| `tiles/trophy_case.png` | blocking, opaque | Glass-fronted trophy display cabinet with gold/silver trophies (map char `C`, `trophy_case`). 16x16, fills the tile. |
| `tiles/desk.png` | blocking, not opaque | Potions classroom desk: wooden table with a bubbling green cauldron and flasks (map char `T`, `desk`). 16x16; top rows transparent, so draw over the floor. |
| `tiles/tileset.png` | 128x32 | All 15 tiles above in an 8-column grid, index order: floor, floor_b, wall_top, wall_face, door_closed, door_open, stairs, torch_0 / torch_1, painting, tapestry, passage_marker (indices 0–11), then appended bookshelf 12, trophy_case 13, desk 14. Size unchanged. |

## Items (`items/`)

| File | Size | Walkable? | Description |
|---|---|---|---|
| `items/key.png` | 16x16 | walkable (pickup) | Old gold key with sparkles, drawn on the floor layer |
| `items/room_of_requirement_door.png` | **32x32 (2x2 tiles)** | blocking (interactable) | Original tall arched double door with glowing violet seams and a star emblem. Occupies 2 wall-face rows x 2 columns. Draw it over plain wall when it "appears". |

## Preview

`preview.png` (768x556): a 12x8-tile corridor at 4x with torches, painting, tapestry, doors, the passage marker,
the Room of Requirement door, stairs, Harry, Filch with his lantern, Mrs. Norris and the key, under a night overlay.
