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

var querystring = "SELECT * FROM CHARACTER_SETS;";

connection.query(querystring, function(err, rows, fields) {
    if (err) 
        throw err;
 
    for (var i in rows) {
        console.log(rows[i]);
    }
});

connection.end();

//express setup
var express = require('express');
var app = express();

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

activatePage("/");
activatePage("/about");
activatePage("/login");
activatePage("/signup");

//listen on localhost
app.listen(8080);
console.log('listening on http://localhost:8080');
