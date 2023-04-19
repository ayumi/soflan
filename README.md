# Soflan.net

## Development tips

`yarn start` - Start local webpack server in dev mode and serve the web app.
`yarn import [path]` - Import simfiles from directory, adding them to the database and converting to special JSON files.
`yarn sql` - Run `sqlite3` and open the song database at `db/dev.sqlite3`.
`yarn knex migrate:up` - Run DB migrations.
`yarn knex migrate:down` - Roll back DB migrations.

## DB Schema

```sql
CREATE TABLE `songs`(
  `id` integer not null primary key autoincrement,
  `title` varchar(255),
  `artist` varchar(255),
  `charts` json, /* .charts section of our JSON Song format (see below). */
  `chart_type_dance_single` boolean, /* Presence of 4 panel Singles chart */
  `chart_type_dance_double` boolean, /* Presence of 8 panel Doubles chart */
  `other_data` json, /* Catch-all for other data in the simfile */
  `created_at` datetime,
  `updated_at` datetime
);
```

## Notes

- Offline script:
  - Parse step charts (SSC, SM).
  - Regenerate song files as JSONs, 1 per song.
  - Song JSONs have condensed notes format. Add helpful info like combo count.
  - Combo count notes: freeze notes add combo when they start, but not when they end (tail). shocks (mines) add 1 combo.
  - Build a single array of songs, which will serve as the index for browsing and searching songs.
  - BONUS: Download song jackets, convert to 2x2 pixel gifs via imagemagick and encode to data uri gif (68 bytes each).
    - convert jacket.png -interpolate Nearest -filter point -resize 2x2 gif:- | openssl base64 | tr -d '\n'
- Web App:
  - Loads the full song index. Build a search indexes by:
    - Name
    - Level
  - Nav bar at top has [ Song Name ][ Difficulty ][ Level ]
  - Search for a song name and select it to activate it. Default difficulty ESP.
  - Difficulty selector switches difficulty. Sticky between songs, unless you use the Level selector. Does not affect song list.
  - Level selector filters song list by level, to help with manual browsing. Sticky but can be disabled.
  - Single/Double selector. Force to single for now.
  - Sticky between page loads (local storage).

## JSON Song format

title: ACE FOR ACES
artist: TAG
type: dance-single
charts:
  medium:  // Difficulty (one of Beginner, Easy, Medium, Hard, Challenge)
    level: 13  // called Meter in SSC
    bpmDisplay: 123
    events:
    - t: 1  // t (time); Beat (Derived from SM/SSC which has measure + measure offset). Precision: 4 decimal points
      c: 1  // c (combo): DDR notes combo count
      n: 0100  // note data. corresponds to simfile NOTES but just 1 line.
    - t: 0
      c: 1
      s: 3  // stop time in seconds.
    - t: 1
      c: 2
      b: 200  // bpm change; new bpm
    bpms:  // All bpm events, denormalized
    - t: 1
      c: 2
      b: 200
    stops:  // All stop events, denormalized
    - t: 1
      c: 2
      b: 200