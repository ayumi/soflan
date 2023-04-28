// Logic for loading Song data and picking charts. Wraps the Chart viewer.
import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { Scatter as ScatterChart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
);

import Chart from './Chart';
import { writeUrlHash } from '../util'

const SONG_DATA_DEFAULT = { charts: [] };
const DIFFICULTY_LABELS = {
  'dance-single': {
    'Beginner': 'bSP',
    'Basic': 'BSP',
    'Difficult': 'DSP',
    'Expert': 'ESP',
    'Challenge': 'CSP',
  },
  'dance-double': {
    'Beginner': 'bDP',
    'Basic': 'BDP',
    'Difficult': 'DDP',
    'Expert': 'EDP',
    'Challenge': 'CDP',
  },
}

const Song = (props) => {
  const [songData, setSongData] = useState(SONG_DATA_DEFAULT);
  const [chartData, setChartData] = useState([]);
  const [chart, setChart] = useState(props.defaultChart);
  const bpmGraphRef = useRef();
  const selectChartRef = useRef();
  function handleSelectChartChange(option) {
    const newChart = option.value;
    setChart(newChart);
    setChartData(songData.charts[newChart]);
    writeUrlHash({ c: newChart });
  }

  useEffect(() => {
    const url = props.songUrl;
    if (url === null) {
      return
    }
    console.log('Fetching song data: ' + url);

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Receieved', data);
        setSongData(data);
      } catch (error) {
        console.log('error', error);
      }
    };

    fetchData();
  }, [props.songUrl]);

  // When songData is loaded, then auto select chart based on the current chart.
  // Otherwise default to the last chart available.
  useEffect(() => {
    if (!songData || !songData['charts'] || songData['charts'].length === 0) {
      return
    }

    if (chart && songData['charts']['chart']) {
      setChartData[chart];
    } else {
      const chartNames = Object.keys(songData['charts']);
      const newChart = chartNames[chartNames.length - 1];
      setChart(newChart);
      selectChartRef.current.setValue({
        value: newChart,
        label: `${getDifficultyLabel(newChart, props.chartType)} ${songData['charts'][newChart]['level']}`
      });
      setChartData(songData['charts'][newChart]);
      writeUrlHash({ c: newChart });
    }
  }, [songData]);

  useEffect(() => {
    const bpmGraphEl = bpmGraphRef.current;
    if (bpmGraphEl) {
      console.log('CanvasRenderingContext2D', bpmGraphEl.ctx);
      console.log('HTMLCanvasElement', bpmGraphEl.canvas);
    }
  }, [chartData]);

  // Each difficulty has a chart
  const chartOptions = Object.entries(songData.charts).map(([difficulty, chartData]) => {
    return {
      value: difficulty,
      label: `${getDifficultyLabel(difficulty, props.chartType)} ${songData.charts[difficulty]['level']}`
    }
  });

  const [bpmLow, bpmHigh] = getBpmLowAndHigh(chartData);

  return (
    <div className='song'>
      <div className='song-meta'>
        <Select
          className='select-chart'
          classNamePrefix='react-select'
          defaultValue={{ value: props.defaultChart, label: getDifficultyLabel(props.defaultChart, props.chartType) }}
          onChange={handleSelectChartChange}
          options={chartOptions}
          ref={selectChartRef}
        />
        {renderBpmSummary(bpmLow, bpmHigh)}
        {renderStopSummary(chartData.stops)}
        <div className='summary-spacer'></div>
        <div className='bpm-graph'>
          {chartData.bpms ? (
            <ScatterChart
              data={getBpmGraphData(chartData, bpmLow, bpmHigh)}
              options={getBpmGraphDataOptions(chartData, bpmLow, bpmHigh)}
              ref={bpmGraphRef}
            />
          ) : null}
        </div>
      </div>
      <Chart
        chartData={chartData}
        handleChartScroll={handleChartScroll}
      />
    </div>
  );
}

function getDifficultyLabel(difficulty, chartType) {
  return DIFFICULTY_LABELS[chartType][difficulty] || difficulty;
}

function getBpmLowAndHigh(chartData) {
  const bpms = chartData.bpms;
  if (!bpms || bpms.length === 0) { return [0, 0]; }

  let bpmLow = bpms[0]['b'];
  let bpmHigh = bpms[0]['b'];
  for (let n = 1; n < bpms.length; n++) {
    if (bpms[n]['b'] < bpmLow) {
      bpmLow = bpms[n]['b'];
    }
    if (bpms[n]['b'] > bpmHigh) {
      bpmHigh = bpms[n]['b'];
    }
  }
  return [bpmLow, bpmHigh]
}

function renderStopSummary(stops) {
  if (!stops || stops.length === 0) { return []; }

  return (<div className='stop-summary'>
    <div className='stop-label'>Stops</div>
    <div className='stop-value'>{stops.length}</div>
  </div>);
}

function renderBpmSummary(bpmLow, bpmHigh) {
  if (!bpmLow && !bpmHigh) { return []; }

  return (<div className='bpm-summary'>
    <div className='bpm-label'>BPM</div>
    <div className='bpm-value'>
      {Math.round(bpmLow)}{bpmHigh !== bpmLow ? `—${Math.round(bpmHigh)}` : ''}
    </div>
  </div>);
}

function getBpmGraphData(chartData, bpmLow, bpmHigh) {
  // Add a point with the max T so the graph is drawn fully to the right
  const stopBpm = (bpmLow + bpmHigh)/2;
  const firstBpm = chartData.bpms[0]['b'];
  const lastNoteBpm = {
    x: chartData.events[chartData.events.length - 1]['t'],
    y: chartData.bpms[chartData.bpms.length - 1]['b'],
  }
  return {
    datasets: [
      {
        id: 1,
        label: 'BPM',
        data: chartData.bpms.map(bpm => ({ x: bpm['t'], y: bpm['b'], c: bpm['c'] })).concat([lastNoteBpm]),
        borderColor: 'blue',
        borderWidth: 1,
        stepped: true,
        pointStyle: false,
        showLine: true,
      },
      {
        id: 2,
        label: 'Stop',
        data: chartData.stops.map(stop => ({ x: stop['t'], y: stopBpm, c: stop['c'] })),
        borderColor: 'magenta',
        elements: {
          point: {
            pointHoverRadius: 20,
            pointStyle: 'line',
            radius: 20,
            rotation: 90,
          }
        }
      },
    ],
  };
}

function getBpmGraphDataOptions(chartData, bpmLow, bpmHigh) {
  const maxT = chartData.events[chartData.events.length - 1]['t'];
  const yMin = bpmLow === bpmHigh ? (bpmLow - 1) : bpmLow;
  const yMax = bpmLow === bpmHigh ? (bpmHigh + 1) : bpmHigh;
  return {
    animation: false,
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      autoPadding: false,
      padding: {
        right: 5,
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        min: 0,
        max: maxT,
        grid: {
          tickLength: 1,
        },
        ticks: {
          display: false,
          stepSize: 100,
        },
      },
      y: {
        beginAtZero: true,
        display: false,
        min: yMin,
        max: yMax,
        ticks: { display: false },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            return context.dataset.label === 'Stop'
              ? `Stop @ ${context.raw['c']}`
              : `${Math.round(context.raw.y)} BPM @ ${context.raw['c']}`;
          }
        }
      }
    }
  }
}

function handleChartScroll(event) {
  console.log(handleChartScroll, event);
}

export default Song
