const axios = require('axios');
const qs = require('querystring')
const config = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
}

function post(url, data, callback) {
    console.log("qs", qs.stringify(data))
    axios.post(url, qs.stringify(data), config)
        .then(function(response) {
            callback(response.data)
        })
        .catch(function(error) {
            console.log(error);
        });
}


function get(url, data, callback) {
    axios.get(url, data)
        .then(function(response) {
            callback(response.data)
        })
        .catch(function(error) {
            console.log(error);
        });
}

module.exports = {
    post,
    get
}