// Logic for loading Song data and picking charts. Wraps the Chart viewer.
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

import Chart from './Chart';

const SONG_DATA_DEFAULT = { charts: [] };

const Song = (props) => {
  const [songData, setSongData] = useState(SONG_DATA_DEFAULT);
  const [chart, setChart] = useState([]);
  const [selectedChartOption, setSelectedChartOption] = useState(null);
  function handleSelectChartChange(option) {
    const difficulty = option.value;
    setSelectedChartOption(difficulty);
    setChart(songData.charts[difficulty])
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
        const json = await response.json();
        console.log('Receieved', json);
        setSongData(json);
      } catch (error) {
        console.log('error', error);
      }
    };

    fetchData();
  }, [props.songUrl]);


  const chartOptions = Object.entries(songData.charts).map(([difficulty, chartData]) => {
    return { value: difficulty, label: difficulty }
  });

  return (
    <div>
      <Select
        defaultValue={selectedChartOption}
        onChange={handleSelectChartChange}
        options={chartOptions}
      />
      <Chart
        chartData={chart}
      />
    </div>
  );
}

export default Song
