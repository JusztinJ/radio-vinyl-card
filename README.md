# Radio Vinyl Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![Validate](https://github.com/JusztinJ/radio-vinyl-card/actions/workflows/validate.yml/badge.svg)](https://github.com/JusztinJ/radio-vinyl-card/actions/workflows/validate.yml)

A Home Assistant dashboard card that plays internet radio from [Radio Browser](https://www.radio-browser.info/) right in your dashboard. The station's logo sits on a vinyl record that spins while it plays, the tonearm drops onto the record, and the current song's title and artist are shown underneath, scrolling when they're too long to fit.

## Features

- Search 50,000+ stations from the Radio Browser directory, with a popular-in-your-country list to start from
- Station logo spinning on a vinyl record, with a tonearm that swings in when playing
- Live song title and artist, scrolling marquee for long names
- Play/pause and volume control
- **Nothing is stored on your Home Assistant server**: logos load straight from each station's own web address, so they never fill up your storage
- Optional `input_text` helper so every device shares the same station
- Visual editor in the dashboard card picker
- HLS streams supported (loads hls.js on demand)

## Requirements

- Home Assistant 2024.8 or newer.
- Internet access from the browser showing the dashboard.

That's all. The card talks to the public [Radio Browser](https://www.radio-browser.info/) service directly from your browser, so **Home Assistant's Radio Browser integration does not need to be installed**. If you already have it, the card works alongside it.

## Installation

### HACS (custom repository)

1. In Home Assistant, open **HACS**.
2. Open the menu (⋮, top right) → **Custom repositories**.
3. Repository: `https://github.com/JusztinJ/radio-vinyl-card`, Type: **Dashboard**, then **Add**.
4. Search HACS for **Radio Vinyl Card** and **Download** it.
5. Reload your browser (Ctrl+Shift+R, or clear the app cache on mobile).

HACS registers the dashboard resource for you.

### Manual

1. Download `radio-vinyl-card.js` from the [latest release](https://github.com/JusztinJ/radio-vinyl-card/releases/latest).
2. Copy it to `/config/www/radio-vinyl-card.js`.
3. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**, URL `/local/radio-vinyl-card.js`, type **JavaScript module**.
4. Reload your browser.

## Usage

Edit a dashboard, **Add card**, and choose **Radio Vinyl Card**, or add it in YAML:

```yaml
type: custom:radio-vinyl-card
```

Tap the playlist button to search for a station, then tap one to start it. The radio plays in the browser showing the dashboard (a wall tablet, for example).

### Options

| Option    | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `entity`  | string | none    | An `input_text` helper to remember the chosen station. Every device showing the card then shares the same station. Without it, each browser remembers its own. |
| `country` | string | `GB`    | Two-letter country code for the list shown before you search (e.g. `HU`, `US`, `DE`). |

#### Sharing the station between devices

Create a helper in **Settings → Devices & services → Helpers → Create helper → Text**, name it *Radio station* (max length 64 is plenty), then:

```yaml
type: custom:radio-vinyl-card
entity: input_text.radio_station
country: GB
```

## About the song information

The card reads the "now playing" text that the station itself publishes, checking every 20 seconds. It tries the Icecast status page first, then the ICY metadata inside the stream. Many Icecast and Shoutcast stations work. Stations that don't make this information available to web pages (some big broadcasters' streams, for example) show **Live** instead.

## Notes

- Browsers only allow audio to start after a tap, so press play after reloading the page.
- If your Home Assistant is on `https://`, stations that only stream over `http://` may be blocked by the browser. Pick an `https` stream of the same station where Radio Browser lists one.
- Playing a station from Home Assistant's **Media** panel on "This device" isn't visible to Home Assistant, so this card can't show it. Start the station from the card instead.

## Credits

Station data from the community-run [Radio Browser](https://www.radio-browser.info/) directory. Selecting a station counts a click for it on Radio Browser, as their API asks.

## License

[MIT](LICENSE)
