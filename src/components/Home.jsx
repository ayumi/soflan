import React, { useState } from 'react';
import Select from 'react-select';

import Song from './Song';

const Home = (props) => {
  // FIXME: Currently dance-single is hardcoded
  const [chartType, setChartType] = useState('dance-single');

  const [songUrl, setSongUrl] = useState(null);
  const [selectedSongOption, setSelectedSongOption] = useState(null);
  function handleSelectSongChange(option) {
    const song = option.value;
    setSelectedSongOption(song);
    setSongUrl(`/songs/${song}--${chartType}.json`);
  }

  const options = props.songs.map(song => {
    return { value: song, label: song }
  });


  return (
    <div>
      <Select
        defaultValue={selectedSongOption}
        onChange={handleSelectSongChange}
        options={options}
      />
      <Song
        songUrl={songUrl}
      />
    </div>
  );
}

export default Home
