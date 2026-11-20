# Slide Werkzeug Pro engine – how it is built

The engine in `public/engines/slide/` is DeckCraft (MIT OR Apache-2.0, https://github.com/storytold/deckcraft)
with two Office Werkstatt patches:

- `deckcraft-i18n.patch` (on deckcraft `3ffeffcdf55984cd1a23401e3362c85ddb3db720`): the web app reads the
  browser language (Office Werkstatt sets it) and installs the translations; adds the Turkish catalog.
  The German, French and Spanish catalogs are copied from storytold/craft-i18n `d80c945`
  (`locales/<lang>/common.tsv` and `deckcraft.tsv` → `apps/deckcraft-web/i18n/<lang>/`).
- `egui-translate.patch` (on storytold/egui `6d518fc`, vendored to `vendor/egui`, `[patch]` paths in Cargo.toml):
  text layout shows a known English interface text in the chosen language; text the user types is never changed.

Build:

    cargo build --release --target wasm32-unknown-unknown -p deckcraft-web     # CRAFT_FONTS_DIR=../craft-fonts
    wasm-bindgen --target web --weak-refs --out-dir out --out-name engine target/wasm32-unknown-unknown/release/deckcraft-web.wasm
    wasm-opt -Oz out/engine_bg.wasm -o public/engines/slide/engine_bg.wasm      # plus engine.js and snippets/
