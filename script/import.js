// Given a folder, reads all simfiles then imports them so the app can use them.
// Write the songs folder and updates songs.json which are used by the web app.
// Also adds songs to the local database.
// Usage: import.js [Directory containing simfiles]

import { glob } from "glob";
import { writeFile } from "node:fs/promises";
import path from 'path';
import normalizePath from 'normalize-path';
import knex from "knex";
import knexfile from "../knexfile.js";
import convertSimfile from "./convert-simfile.js";

const __dirname = path.resolve();
const OUTPUT_SONGS_PATH = path.join(__dirname, 'public', 'songs');
const OUTPUT_SONGLIST = path.join(__dirname, 'src', 'songs.json');

const logAndExit = (message) => {
  console.error(message);
  process.exit(1);
}

const folder = process.argv[2];
if (!folder) {
  logAndExit("Folder is required.");
}

let files;
try {
  files = await glob(normalizePath(folder) + '/**/*.+(sm|ssc)', {});
} catch (e) {
  logAndExit(e);
}

let n = 0;
let failedFiles = [];
const connection = knex(knexfile);
for (const file of files) {
  console.log(`Importing ${file}`)
  let song;
  try {
    song = await convertSimfile(file);
  } catch (e) {
    console.warn(`Failed to import ${file}`, e);
    failedFiles.push(file);
    continue;
  }

  // HACK FIXME: Remove illegal filename chars
  song.title = song.title.replace(/[/\\?%*:|"<>]/g, '-');
  song.artist = song.artist.replace(/[/\\?%*:|"<>]/g, '-');

  try {
    const result = await connection("songs")
      .insert({
        title: song.title,
        artist: song.artist,
        charts: song.charts,
        chart_type_dance_single: !!song.charts["dance-single"],
        chart_type_dance_double: !!song.charts["dance-double"],
        other_data: song.otherData,
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

      const chartSong = {
        charts: chartTypeCharts,
        title: song.title,
        artist: song.artist,
        type: song.type,
      }
      const songFilename = `${song.title} - ${song.artist}--${chartType}.json`;
      console.log(`Writing ${songFilename}`);
      const json = JSON.stringify(chartSong);
      try {
        await writeFile(path.join(OUTPUT_SONGS_PATH, songFilename), json);
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
    .orderBy("created_at", "desc")
  for (const { title, artist } of result) {
    songList.push(`${title} - ${artist}`);
  }
  await writeFile(OUTPUT_SONGLIST, JSON.stringify(songList));

} catch (e) {
  logAndExit(e);
}

if (failedFiles.length > 0) {
  console.warn(`Failed to import ${failedFiles.length} files:`);
  console.log(failedFiles);
}

console.log(`Done, ${n} imported, ${songList.length} total`);

process.exit(0);
