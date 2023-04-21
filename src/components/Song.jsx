// Logic for loading Song data and picking charts. Wraps the Chart viewer.
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

import Chart from './Chart';
import { writeUrlHash } from '../util'

const SONG_DATA_DEFAULT = { charts: [] };

const Song = (props) => {
  const [songData, setSongData] = useState(SONG_DATA_DEFAULT);
  const [chartData, setChartData] = useState([]);
  const [chart, setChart] = useState(props.defaultChart);
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
        setChartData(data.charts[chart]);
      } catch (error) {
        console.log('error', error);
      }
    };

    fetchData();
  }, [props.songUrl]);

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
      />
      <Chart
        chartData={chartData}
      />
    </div>
  );
}

export default Song
