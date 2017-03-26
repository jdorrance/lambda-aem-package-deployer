// require modules
var fs = require('fs');
var archiver = require('archiver');

// create a file to stream archive data to.
var output = fs.createWriteStream(__dirname + '/build.zip');
var archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
});

// listen for all archive data to be written
output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

// good practice to catch this error explicitly
archive.on('error', function(err) {
    throw err;
});

// pipe archive data to the file
archive.pipe(output);

// append a file from stream
var file1 = __dirname + '/index.js';
archive.append(fs.createReadStream(file1), { name: 'index.js' });

// append files from a directory
archive.directory('node_modules/');

// finalize the archive (ie we are done appending files but streams have to finish yet)
archive.finalize();