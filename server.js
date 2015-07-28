var port = 8080;
var fs = require('fs');

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
var app = express();

//add body parser to read post requests
var bodyParser = require('body-parser')
app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

//set view engine to ejs
app.set('view engine', 'ejs');

//give static access to 'static' directory
app.use(express.static('static'));

//routing index
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

//routing about
app.get("/about", function (request, response) {
    response.render('pages/about');
    console.log('got a GET request from about');
});

//routing login
app.get("/login", function (request, response) {
    response.render('pages/login');
    console.log('got a GET request from login');
});
app.post('/login', function (request, response) {
    console.log("got a login POST request");
});

//routing signup
app.get('/signup', function (request, response) {
    response.render('pages/signup');
    console.log('got a GET request from signup');
});
app.post('/signup', function (request, response) {
    if (request.body.user.pwd !== request.body.user.repeatpwd) {
        response.render('pages/signup', {
            create_account_problem_text: "Passwords did not match. Please try again."
        });
    }
    else {
        response.render('pages/account_creation_success', {
            email: request.body.user.email
        });
    }
});

// routing 404 event
app.use(function (request, response) {
    response.status(400);
    response.render('pages/404');
});
  
// routing 500 event
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
