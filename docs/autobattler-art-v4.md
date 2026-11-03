# Heroes Compendium — ассеты святилища, глав и Ориона

Встроенный ImageGen. Три фона глав и святилище сохранены в `site/public/autobattler/chapter-1.webp`, `chapter-2.webp`, `chapter-3.webp`, `summon-shrine.webp`. Лист Ориона сохранён в `site/public/autobattler/orion-cutout.webp`, координаты деталей — в `orion-cutout.json`.

Общая часть запроса для фонов:

> Wide 16:9 original game environment plate for stylized hand painted 2D fantasy idle RPG. Side-on three-quarter slightly elevated viewpoint, deliberate clean silhouettes, painted broad texture, restrained light, simple readable color blocks, consistent material detail. No characters, interface, text, photorealism, logos or glowing particles. Keep a broad continuous walkable foreground centered across the lower half with no foreground occluders.

- Глава 1: Sunlit forest trail with pale mossy roots, birch trunks, airy sage green foliage, a warm weathered stone and dirt path running horizontally. Background trees behind play surface.
- Глава 2: Shadowy dense forest path, desaturated teal and olive, crooked oak trunks and fallen timber behind the broad combat path, small low ruined wall in rear, overcast light.
- Глава 3: Abandoned fantasy village street and broad paved square, old timber houses and broken picket fences in rear, muted rust and ochre, overcast afternoon. Walkable continuous foreground.
- Святилище: Symmetrical ancient stone shrine interior, straight-on perspective, columned alcove, broad low central empty altar centered at 70% image height, stair and platform, dusty slate stone and faint warm bronze. Leave air above altar for separately rendered crystal; no crystal in image.

Орион, с исходной боевой фигуркой как референсом:

> Create a single square production 2D cutout animation sprite atlas for the exact chibi celestial knight Orion in reference. This is a disassembled asset, not an illustration of a whole person. Strict aligned 3 columns x 3 rows uniform grid, each isolated object centered in its own square cell with large transparent gutters; no grid lines, letters, text, labels or shadows. Preserve deep cobalt armor, thick polished gold borders, white plume, star motifs, same 3/4 right-facing view. Row 1 left to right: (1) helmeted head with white plume and gold star halo, (2) armored torso and short split tabard without limbs or head, (3) entire round star shield as a single undamaged rigid object. Row 2: (4) single articulated-look armored upper arm with shoulder pauldron, (5) single armored forearm ending in gloved closed gripping hand, (6) isolated full gold and cobalt spear with straight shaft diagonal from bottom left to top right, without hand. Row 3: (7) one armored thigh, (8) one armored shin with foot facing right, (9) blue star cloth cape with gold hem as one separate fabric piece. All nine separate parts are required, never overlap the boundaries of their individual cells. Preserve transparent alpha. Parts should be clean and readable as game sprites.
