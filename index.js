const https = require('https');
const fs = require('fs');
const urllib = require('url');
const request = require('request'); // imported module

//CONSTANTS
const tmpRoot = "/tmp/";

const download = function (url, dest, cb) {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, function (response) {
        if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
            console.log(url);
            if (urllib.parse(response.headers.location).hostname) {
                console.log('doing redirect to ' + response.headers.location);
                return (download(response.headers.location, dest, cb));
            } else {
                console.warn('hostname on redirect not included');
            }
        } else {
            console.log('saving file to temp location');
            response.pipe(file);
            file.on('finish', function () {
                console.log('download complete');
                file.close(cb(null, file)); // close() is async, call cb after close completes.
            });
        }
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};

let index = function index(event, context, callback) {
    return download(event.url, tmpRoot + event.filename, function (err, file) {
        if (err) {
            console.error(err);
            callback(err);
        } else {
            const formData = {
                file: {
                    value: fs.createReadStream(file.path),
                    options: {
                        filename: event.filename
                    }
                },
                name: event.packagename,
                force: 'true',
                install: 'true'
            };
            let url = 'http://' + event.target + '/crx/packmgr/service.jsp';
            if(event && event.username && event.password){
                url = 'http://' + event.username + ':' + event.password + '@' + event.target + '/crx/packmgr/service.jsp';
            }
            console.log(url);
            request.post({
                url: url,
                formData: formData
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    console.error('upload failed:', err);
                    callback(err);
                }
                console.log('Upload successful!  Server responded with:', body);
                let replicateUrl = 'http://' + event.target + '/bin/replicate.json';
                if(event && event.username && event.password){
                    replicateUrl = 'http://' + event.username + ':' + event.password + '@' + event.target + '/bin/replicate.json';
                }
                request.post({
                    url: replicateUrl,
                    formData: {
                        path: "/etc/packages/" + event.filename,
                        cmd: "activate"
                    }
                }, function optionalCallback(err, httpResponse, body) {
                    if (err) {
                        console.error('upload failed:', err);
                        callback(err);
                    } else {
                        console.log("replication successful! Server responded with", body);
                        callback(null, body);
                    }
                })
            });
    }
    });

};
/*const event = {
    "url": "https://circleci-tkn.rhcloud.com/api/v1/project/jdorrance/scc-aem-foundation/tree/master/latest/artifacts/com.scc.sccfoundation-code-6.2-SNAPSHOT.jar?circle-token=4c531db48d36e9586ff0f10b6d69bed840242dad",
    "filename": "com.scc.sccfoundation-code-6.2-SNAPSHOT.zip",
    "packagename": "com.scc.sccfoundation-code-6.2-SNAPSHOT",
    "target": "107.20.131.223:4502",
    "username": "admin",
    "password": "admin"
};*/

//index(event, null, console.log);
exports.handler = index;