// This function reads a simfile from a path and returns the converted simfile as a JS object.

import fs from "node:fs";
import * as readline from "node:readline";

// Event T values will be quantized to this
const T_QUANT = 1 / 128;

export default async function convertSimfile(path) {
  const fileStream = fs.createReadStream(path);
  const reader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  // Initialize song data.
  const song = {
    title: "",
    artist: "",
    charts: {},
    otherData: {},
  };

  const CHART_BASE = {
    level: 0,
    combo: 0,
    bpmDisplay: null,
    bpmMin: 0,
    bpmMax: 0,
    events: [],
    bpms: [],
    stops: [],
  };

  const DIFF_OVERRIDES = {
    Easy: "Basic",
    Medium: "Difficult",
    Hard: "Expert",
  };

  let baseBpmsBeats = [];
  let baseStopsBeats = [];
  let baseDisplayBpm = null;

  // Initialize difficulty specific stepchart data. This holds
  // data while we fill it in during NOTEDATA and NOTES.
  let chart = structuredClone(CHART_BASE);
  let chartType = "";
  let chartDiff = "";
  // Null now but will be set to [] later
  let chartBpmsBeats = null;
  let chartStopsBeats = null;
  let chartBpmNext = null;
  let chartStopNext = null;
  let chartDisplayBpm = null;
  let smNotesPropList = []; // SM format has #NOTES: followed by Chart type, Description/author,  Difficulty, meter, Groove radar values. Store the data here.
  let measureLines = [];

  // For sanity checking
  let notesActive = false;
  let noteDataActive = false;

  // Measure and Combo
  let t = 0;
  let c = 0;

  const resetChart = () => {
    chart = structuredClone(CHART_BASE);
    chartType = "";
    chartDiff = "";
    chartBpmsBeats = null;
    chartStopsBeats = null;
    chartBpmNext = null;
    chartStopNext = null;
    chartDisplayBpm = null;
    smNotesPropList = [];
    measureLines = [];
    notesActive = false;
    noteDataActive = false;
    t = 0;
    c = 0;
  };

  // Turning events by beat to by combo
  const addBpmEvents = () => {
    // console.log('chartBpmNext', chartBpmNext, 't', t);
    if (chartBpmNext && t >= chartBpmNext[0]) {
      const bpm = {
        t: chartBpmNext[0],
        c,
        b: chartBpmNext[1],
      };
      chart.events.push(bpm);
      chart.bpms.push(bpm);
      chartBpmNext = chartBpmsBeats.shift();
    }
  };
  const addStopEvents = () => {
    // console.log('chartStopNext', chartStopNext, 't', t);
    if (chartStopNext && t >= chartStopNext[0]) {
      const stop = {
        t: chartStopNext[0],
        c,
        s: chartStopNext[1],
      };
      chart.events.push(stop);
      chart.stops.push(stop);
      chartStopNext = chartStopsBeats.shift();
    }
  };

  // Helper for aborting
  const logAndExit = (message, line) => {
    console.error(`Error: ${message}`);
    console.debug(`line: ${line}`);
    console.debug(`chartType: ${chartType}`);
    console.debug(`chartDiff: ${chartDiff}`);
    console.debug(`smNotesPropList: ${smNotesPropList}`);
    console.debug(`chart: ${JSON.stringify(chart)}`);
    throw new Error(message);
  };

  // reader.on("line", (line) => {
  for await (let line of reader) {
    line = line.trim();

    if (line.slice(0, 2) === "//" || line === "") {
      continue;
    } else if (line === "#NOTEDATA:;") {
      if (noteDataActive) {
        logAndExit("NOTEDATA while in previous NOTEDATA.", line);
      }
      // Init BPM changes and Stops by Beat. Later we calculate by Combo.
      chartBpmsBeats = structuredClone(baseBpmsBeats);
      chartStopsBeats = structuredClone(baseStopsBeats);
      noteDataActive = true;
      continue;
    } else if (line === "#NOTES:") {
      if (notesActive) {
        logAndExit("NOTES while in previous NOTES.", line);
      }
      // In case we didn't have NOTEDATA
      chartBpmsBeats = chartBpmsBeats || structuredClone(baseBpmsBeats);
      chartStopsBeats = chartStopsBeats || structuredClone(baseStopsBeats);
      chartBpmNext = chartBpmsBeats.shift();
      chartStopNext = chartStopsBeats.shift();
      notesActive = true;
      continue;

      // Comma ends a measure in a NOTES, semicolon can as well.
    } else if (line === "," || line === ";") {
      const nextMeasureT = t + 4;
      const tPerLine = 4 / measureLines.length;
      for (const mLine of measureLines) {
        // Only add events if arrows are present (nonzero)
        if (mLine.split("").some((s) => s !== "0")) {
          chart.events.push({
            t,
            c,
            n: mLine,
          });

          // Only add combo if there's notes besides hold tail (normal, hold head, roll head, mine all OK).
          if (
            mLine
              .split("")
              .some((s) => s === "1" || s === "2" || s === "4" || s === "M")
          ) {
            c++;
          }
        }
        t += tPerLine;
        // Round t to the the nearest 1/128, otherwise keep it funny
        // (in case the measure was divided into non-1/128 parts e.g. 3 notes in a beat)
        if (t % T_QUANT !== 0) {
          const numberOfQuantaOverT = (t - Math.floor(t) + 0.00001) / T_QUANT;
          if (numberOfQuantaOverT - Math.floor(numberOfQuantaOverT) < 0.1) {
            t = Math.floor(t) + Math.floor(numberOfQuantaOverT) * T_QUANT;
          }
        }
        addBpmEvents();
        addStopEvents();
      }
      t = nextMeasureT;
      addBpmEvents();
      addStopEvents();
      measureLines = [];

      // When processing measure end (,), we can stop here.
      // When processing song end (;), then continue to song end logic.
      if (line == ",") {
        continue;
      }
    }

    // Semicolon ends NOTES and a chart
    if (line === ";") {
      if (!notesActive) {
        logAndExit("Semicolon ; while not in NOTES.", line);
      }

      // Handle SM format
      // Unused: Description (1), Groove radar (4)
      if (smNotesPropList.length > 0) {
        chartType = smNotesPropList[0];
        chartDiff = smNotesPropList[2];
        chart.level = parseFloat(smNotesPropList[3]);
      }
      const bpmMin = chart.bpms[0] && chart.bpms[0].b;
      const bpmMax =
        chart.bpms[chart.bpms.length - 1] &&
        chart.bpms[chart.bpms.length - 1].b;
      chart.bpmMin = bpmMin;
      chart.bpmMax = bpmMax;
      chart.bpmDisplay =
        chartDisplayBpm ||
        baseDisplayBpm ||
        (bpmMin === bpmMax ? bpmMin : `${bpmMin}–${bpmMax}`);
      chart.combo = c;

      // Flush to song data and reset active chart
      const chartDiffKey = DIFF_OVERRIDES[chartDiff] || chartDiff;
      song.charts[chartType] = song.charts[chartType] || {};
      song.charts[chartType][chartDiffKey] = structuredClone(chart);
      resetChart();
      continue;
    }

    // If notes are active, then do notes stuff
    if (notesActive) {
      // Check if this is a notes prop line by looking for ending colon :
      if (line.slice(-1) === ":") {
        if (smNotesPropList.length >= 5) {
          logAndExit("Over 5 NOTES colon props.", line);
        }
        const propData = line.trim().slice(0, -1);
        smNotesPropList.push(propData);

        // Otherwise it's a notes data line.
      } else {
        measureLines.push(line);
      }
      continue;
    }

    // Old fashioned parsing
    if (line.slice(0, 1) !== "#" && line.slice(-1) !== ";") {
      logAndExit("Malformed line; should start with # and end with ;", line);
    }
    const lineParts = line.slice(1, -1).split(":");
    const [key, value] = lineParts;
    switch (key) {
      case "TITLE":
        song.title = value;
        break;
      case "ARTIST":
        song.artist = value;
        break;
      case "BPMS":
        //0=100,20=200,52=825.608,63.875=200,128=100,160=200
        //[[0,100], [20,200], ...]
        const bpmsByBeat = value
          .split(",")
          .map((beatVal) => beatVal.split("=").map((s) => parseFloat(s)));
        if (noteDataActive || notesActive) {
          chartBpmsBeats = bpmsByBeat;
        } else {
          baseBpmsBeats = bpmsByBeat;
        }
        break;
      case "STOPS":
        const stopsByBeat = value
          .split(",")
          .map((beatVal) => beatVal.split("=").map((s) => parseFloat(s)));
        if (noteDataActive || notesActive) {
          chartStopsBeats = stopsByBeat;
        } else {
          baseStopsBeats = stopsByBeat;
        }
        break;
      case "STEPSTYPE":
        chartType = value;
        break;
      case "DIFFICULTY":
        chartDiff = value;
        break;
      case "METER":
        chart.level = parseFloat(value);
        break;
      case "DISPLAYBPM":
        // #DISPLAYBPM:90:270; -> BPM changes between two values.
        const displayBpmMax = lineParts[2];
        const displayBpmValue = displayBpmMax
          ? `${value}–${displayBpmMax}`
          : value;
        if (noteDataActive || notesActive) {
          chartDisplayBpm = displayBpmValue;
        } else {
          baseDisplayBpm = displayBpmValue;
        }
        break;
      default:
        song.otherData[key] = value;
    }
  }

  return song;
}
