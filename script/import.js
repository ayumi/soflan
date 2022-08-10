// Given a folder, finds all simfiles and imports them to the songs folder.
// Also adds songs to the local database.
// Usage: import.js [Directory containing simfiles]

import _ from "lodash";
import glob from "glob";
import { writeFile } from "node:fs/promises";
import path from 'path';
import knex from "knex";
import knexfile from "../knexfile.js";
import convertSimfile from "./convert-simfile.js";

const __dirname = path.resolve();
const SONGS_PATH = path.join(__dirname, 'public', 'songs');
const SONGLIST = path.join(__dirname, 'src', 'songs.json');

const logAndExit = (message) => {
  console.error(message);
  process.exit(1);
}

const folder = process.argv[2];
if (!folder) {
  logAndExit("Folder is required.");
}

glob(folder + '/**/*.+(sm|ssc)', {}, async (err, files) => {
  if (err) {
    logAndExit(err);
  }

  let n = 0;
  const connection = knex(knexfile);
  for (const file of files) {
    console.log(`Importing ${file}`)
    const song = await convertSimfile(file);
    try {
      const result = await connection("songs")
        .insert({
          title: song.title,
          artist: song.artist,
          charts: song.charts,
          chart_type_dance_single: !!song.charts["dance-single"],
          chart_type_dance_double: !!song.charts["dance-double"],
          other_data: song.other_data,
        })
        .onConflict(["title", "artist"])
        .merge()
      const id = result[0];
      if (id === 0) {
        console.log("Updated existing DB record");
      } else {
        n++;
        console.log(`Inserted DB record ${id}`);
      }

      delete song["otherData"];
      // Write song JSONs which are type specific (single, double)
      for (const [chartType, chartTypeCharts] of Object.entries(song.charts)) {
        if (chartType !== "dance-single" && chartType !== "dance-double") {
          console.log(`Skipping chart type ${chartType}`);
          continue;
        }

        const chartSong = _.pick(song, ["title,", "artist", "type"])
        chartSong["charts"] = chartTypeCharts
        const songFilename = `${song.title} - ${song.artist}--${chartType}.json`;
        console.log(`Writing ${songFilename}`);
        const json = JSON.stringify(chartSong);
        try {
          await writeFile(path.join(SONGS_PATH, songFilename), json);
        } catch (e) {
          logAndExit(e);
        }
      }
    } catch (e) {
      logAndExit(e);
    }
  }

  console.log("Writing song list");
  const songList = [];
  try {
    const result = await connection("songs")
      .select({
        title: "title",
        artist: "artist",
      })
    for (const { title, artist } of result) {
      songList.push(`${title} - ${artist}`);
    }
    await writeFile(SONGLIST, JSON.stringify(songList));

  } catch (e) {
    logAndExit(e);
  }

  console.log(`Done, ${n} imported, ${songList.length} total`);

  // it gets stuck here, maybe due to giving glob() an async callback fn?
  process.exit(0);
})