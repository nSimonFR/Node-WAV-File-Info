const fs = require('fs');

const wavFileInfo = {};

wavFileInfo.infoByFilename = (filename) => {
  const buffer = Buffer.alloc(40); // first 40 bytes are RIFF header
  const fd = fs.openSync(filename, 'r');
  fs.readSync(fd, buffer, 0, 40, 0);
  const result = wavFileInfo.infoFromBuffer(buffer);
  fs.closeSync(fd);
  return result;
};

wavFileInfo.infoFromBuffer = (buffer) => {
  const readResult = {};

  // this a list of sequenced bytes in the 40 byte header. This builds the read_result object.
  //  Property name / Data type / Length
  const reads = [
    ['riff_head', 'string', 4],
    ['chunk_size', 'uinteger', 4],
    ['wave_identifier', 'string', 4],
    ['fmt_identifier', 'string', 4],
    ['subchunk_size', 'integer', 4],
    ['audio_format', 'integer', 2],
    ['num_channels', 'integer', 2],
    ['sample_rate', 'uinteger', 4],
    ['byte_rate', 'integer', 4],
    ['block_align', 'integer', 2],
    ['bits_per_sample', 'integer', 2],
    // ['uhm','integer',2],
    ['data_identifier', 'string', 4],
    // ['sub_chunk2_size', 'integer', 4],
  ];

  let i = 0;
  let pointer = 0;
  const readWav = () => {
    const read = reads[i];

    i += 1;
    if (read[1] === 'string') {
      readResult[read[0]] = buffer.toString('ascii', pointer, pointer + read[2]);
      pointer += read[2]; // pointer = pointer plus # bytes
    } else if (read[1] === 'integer') {
      readResult[read[0]] = buffer.readUInt16LE(pointer, read[2]);
      pointer += read[2];
    } else if (read[1] === 'uinteger') {
      readResult[read[0]] = buffer.readInt32LE(pointer, read[2]);
      pointer += read[2];
    }
    if (i < reads.length) return readWav();
    if (readResult.riff_head !== 'RIFF') throw new Error('Expected "RIFF" string at 0');
    if (readResult.wave_identifier !== 'WAVE') throw new Error('Expected "WAVE" string at 4');
    if (readResult.fmt_identifier !== 'fmt ') throw new Error('Expected "fmt " string at 8');
    if (
      (readResult.audio_format !== 1) && // Wav
      (readResult.audio_format !== 65534) && // Extensible PCM
      (readResult.audio_format !== 2) && // Wav
      (readResult.audio_format !== 22127) && // Vorbis ?? (issue #11)
      (readResult.audio_format !== 3)) { // Wav
        throw new Error(`Unknown format: ${readResult.audio_format}`);
    }
    // if ((readResult.chunk_size + 8) !== stats.size) throw new Error('chunk_size does not match file size');
    // if ((read_result.data_identifier) != "data") throw new Error("Expected data identifier at the end of the header")

    return {
      header: readResult,
      duration: ((readResult.chunk_size)
        / (readResult.sample_rate * readResult.num_channels * (readResult.bits_per_sample / 8))),
    };
  };
  return readWav();
};

module.exports = wavFileInfo;