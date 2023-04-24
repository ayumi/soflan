// Logic for loading Song data and picking charts. Wraps the Chart viewer.
import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';

import Chart from './Chart';
import { writeUrlHash } from '../util'

const SONG_DATA_DEFAULT = { charts: [] };

const Song = (props) => {
  const [songData, setSongData] = useState(SONG_DATA_DEFAULT);
  const [chartData, setChartData] = useState([]);
  const [chart, setChart] = useState(props.defaultChart);
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
      selectChartRef.current.setValue({ value: newChart, label: newChart });
      setChartData(songData['charts'][newChart]);
      writeUrlHash({ c: newChart });
    }
  }, [songData]);

  // Each difficulty has a chart
  const chartOptions = Object.entries(songData.charts).map(([difficulty, chartData]) => {
    return { value: difficulty, label: difficulty }
  });

  return (
    <div>
      <Select
        defaultValue={{ label: props.defaultChart, value: props.defaultChart }}
        onChange={handleSelectChartChange}
        options={chartOptions}
        ref={selectChartRef}
      />
      <Chart
        chartData={chartData}
      />
    </div>
  );
}

export default Song
