# Soflan.net

DDR step chart viewer. It's a client-side web app written in React and JS for mobile and desktop web browsers.

## Development tips

Requirements: Yarn, NodeJS, SQLite.

- `yarn start` - Start local webpack server in dev mode and serve the web app.
- `yarn import [path]` - Import simfiles (SM, SSC format) from directory, adding them to the database and converting to special JSON files.
- `yarn sql` - Run `sqlite3` and open the song database at `db/dev.sqlite3`.
- `yarn knex migrate:up` - Run DB migrations.
- `yarn knex migrate:down` - Roll back DB migrations.

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

## JSON Song format

```yaml
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
```

## Misc

Copyright 2023 Ayumi Yu, licensed under the MIT License.
