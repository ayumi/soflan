import React, { useState } from 'react';
import Select from 'react-select';
import _ from 'lodash';

import Song from './Song';

const Home = (props) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [songUrl, setSongUrl] = useState(null);
  function handleSelectChange(option) {
    setSelectedOption(option.value);
    setSongUrl("/songs/" + option.value + "--dance-single.json");
  }

  const options = _.map(props.songs, song => {
    return { value: song, label: song }
  });


  return (
    <div>
      <Select
        defaultValue={selectedOption}
        onChange={handleSelectChange}
        options={options}
      />
      <Song
        songUrl={songUrl}
      />
    </div>
  );
}

export default Home
