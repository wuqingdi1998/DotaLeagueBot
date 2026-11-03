# Оригинальные боевые рисунки Heroes Compendium

Созданы 3 ноября 2026 встроенным инструментом `imagegen` (без CLI). Каждый герой генерировался отдельным запросом. Источники сохранены в `site/public/autobattler/combat-sources/`, игровые версии – в `site/public/autobattler/combat/`. Большие портреты не заменены.

## Общий промпт

```text
Use case: stylized-concept. Production transparent combat sprite for original 2D fantasy idle battler. One {subject}. Full body, all feet and weapon visible, centered with 8% transparent margin. Three-quarter battle ready pose looking and facing RIGHT. Compact super-deformed adult fantasy hero proportions, THREE HEADS TALL, large expressive head, broad simplified torso, short sturdy legs, oversized readable weapon. Clean bold dark contour, polished cel shaded painted surfaces, colorful controlled lighting, readable at 100px tall. Not realistic human proportions. Not a portrait crop. No scenery, no floor, no text, no letters, no logos, actual transparent background. Consistent collectible mobile RPG combat character art.
```

Параметр `transparent_background: true` во всех запросах.

## Subject по ID

- **iskra**: female redheaded warrior, long red ponytail, red and bronze plate armor, curved flaming sword
- **veya**: gentle silver-haired female healer in ivory and sage robes, gold spiral staff with small green leaves
- **sokol**: male hooded forest archer in olive cloak, brown leather armor, wooden longbow, small falcon perched on shoulder
- **mirra**: silver-haired female ice mage, flowing pale blue hair, navy and white robe, blue crystal staff
- **ten**: male dark-haired masked rogue, black and crimson leather armor, crimson scarf, two short daggers
- **kremen**: stocky red-bearded dwarf guardian, charcoal and bronze heavy armor, huge square hammer and small shield
- **ruta**: dark-skinned female druid, dark braided hair, mustard and green robes, wooden staff with leaves
- **bor**: burly mature brown-bearded barbarian, fur mantle, brown leather and iron armor, large stone warhammer
- **lira**: female dark-haired huntress, mustard hooded cloak down, black and ochre leather armor, compact crossbow
- **morok**: pale white-haired male necromancer, burgundy and dark brown robe, hooked bone staff
- **zefir**: male teal-haired agile swordsman, teal scarf and ivory sleeveless tunic, curved silver blade
- **yantar**: male brown-skinned golden-armored warrior, short black hair and beard, white cape, golden sword
- **azur**: male dark blue-haired sorcerer, white and blue longcoat, blue crystal trident staff
- **astra**: female blonde celestial priestess, ivory and gold robes, golden circular celestial staff
- **granit**: massive stone golem with armored gray rocks, bright turquoise crystals growing from shoulders and chest
- **nox**: hooded male raven assassin, black feathers cape, dark leather armor, two crescent daggers
- **sol**: dark-skinned female white-haired sun mage, white and golden robes, staff topped with radiant golden sun
- **taiga**: female redheaded ranger, green leather armor, fur collar, wooden crossbow, forest hunter
- **rion**: male auburn-haired warrior, red lamellar armor, wide crimson sash, broad curved sword
- **flor**: dark-skinned female floral healer, curly dark hair with pink flowers, white and coral robes, flower staff
- **echo**: pale male long silver-haired scholar mage, charcoal and navy robes, bronze accents, open spellbook and slim wand
- **orion**: celestial knight in navy and gold armor, closed helmet, cosmic round shield with stars, ornate spear
- **selena**: female short silver-haired assassin, violet and black armor, flowing purple ribbons, two crescent blades

## Бастион

В качестве исходного изображения использован собственный `sources/bastion.webp`, просмотренный перед генерацией. Промпт:

```text
Use case: style-transfer. Create a NEW separate combat sprite of this same original knight Bastion for a polished 2D fantasy idle battle game. Keep the emerald and gold armor, closed helmet, lion shield and sword identity. Redraw as a 3-heads-tall compact super-deformed game character: large helmet/head, broad shoulders, short stout legs, oversized clearly readable shield and weapon. Clean bold contour, simplified cel shaded painted surfaces, readable at 100px tall. Entire full body including feet and weapon in frame, centered with 8% transparent margin. Three-quarter combat ready view facing RIGHT. No scenery, no floor, no text, actual transparent background. This must be a new compact drawing, not a shrink of the reference illustration. Save generated asset.
```

