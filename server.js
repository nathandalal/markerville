var port = 8080;
/*
var jsonfile = require('jsonfile');
var util = require('util');
jsonfile.writeFile("/temp_files/response.json", response, {spaces: 4}, function (err) {
    console.error(err);
});
*/
fs = require('fs');

//msyql setup
var mysql = require('mysql');

//create mysql connection
var connection = mysql.createConnection({
    host     : 'canaryctr-donald.stanford.edu',
    user     : 'markerville_user',
    password : 'b1omark3rsRock!',
    database : 'information_schema'
});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});

/*
var querystring = "SELECT * FROM CHARACTER_SETS;";

connection.query(querystring, function(err, rows, fields) {
    if (err) 
        throw err;
 
    for (var i in rows) {
        console.log(rows[i]);
    }
});
*/

//express setup
var express = require('express');
var expose = require('express-expose');
var app = express();
//app = expose(app);

/*
//serve favicon
var favicon = require('serve-favicon');
app.use(favicon(__dirname + '/static/images/favicon.ico'));
*/

//set view engine to ejs
app.set('view engine', 'ejs');

//give static access to 'static' directory
app.use(express.static('static'));

// use response.render to load up an ejs view file
// render will by default look in views subfolder -- no need to specify
function activatePage(viewsPath) {
    app.get(viewsPath, function(request, response) {
        if(viewsPath == '/')
            response.render('pages/index');
        else
            response.render('pages' + viewsPath);
    });
}

/*
app.expose(function random() {
    console.log(748372985473);
}, "printNumber");
*/

app.get('/', function (request, response) {
    console.log('got a GET request from index');
    var biomarkerName = request.query['biomarker'];
    if (biomarkerName == undefined)
        response.render('pages/index', {
            search_failed: false
        });
    else {
        biomarkerName = biomarkerName.toUpperCase();
        var biomarkerJSON = JSON.parse(fs.readFileSync("static/temp_files/biomarker_sample.json", "utf8"));

        var biomarkerList = [];
        for (var marker in biomarkerJSON)
            biomarkerList.push(marker);

        if (biomarkerJSON[biomarkerName] !== undefined) {
            biomarkerJSON = biomarkerJSON[biomarkerName];
            response.render('pages/dossier', {
                biomarkerName: biomarkerName,
                biomarkerInfo: biomarkerJSON
            });
        }
        else {
            response.render('pages/index', {
                search_failed: true,
                biomarkerName: biomarkerName
            });
        }
    }
});

app.get("/about", function (request, response) {
    response.render('pages/about');
    console.log('got a GET request from about');
});

app.get("/login", function (request, response) {
    response.render('pages/login');
    console.log('got a GET request from login');
});
app.post('/login', function (request, response) {
    console.log("got a login POST request");
});

app.get("/signup", function (request, response) {
    response.render('pages/signup');
    console.log('got a GET request from signup');
});

// Handle 404 - Page Not Found
app.use(function (request, response) {
    response.status(400);
    response.render('pages/404');
});
  
// Handle 500 - Internal Server Error
app.use(function (error, request, response, next) {
    response.status(500);
    response.render('pages/500');
    console.log("Internal server error: \n" + error);
});


//listen on localhost
app.listen(port);
console.log('listening on http://localhost:' + port);

//end mysql connection
connection.end();
