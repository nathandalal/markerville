var querystring = "";
var port = 7777;
var fs = require('fs');

//msyql setup
var mysql = require('mysql');

//create mysql pool
var pool = mysql.createPool({
    host     : 'canaryctr-donald.stanford.edu',
    user     : 'markerville_user',
    password : 'b1omark3rsRock!',
    database : 'MARKERVILLE',
    multipleStatements: true
});

var NUM_BIOMARKERS_SERVER = 10;
var NUM_DISEASES_SERVER = 10;
var NUM_USERS_SERVER = 0;

querystring = "SELECT COUNT(*) FROM Biomolecules;" +
                "SELECT COUNT(*) FROM Diseases;" +
                "SELECT COUNT(*) FROM Users;";
pool.query(querystring, function(err, rows, fields) {
    if (err) {
        throw err;
        return;
    }

    NUM_BIOMARKERS_SERVER = rows[0][0]["COUNT(*)"];
    NUM_DISEASES_SERVER = rows[1][0]["COUNT(*)"];
    NUM_USERS_SERVER = rows[2][0]["COUNT(*)"];
});

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
    if (biomarkerName == undefined) {
        response.render('pages/index', {
            search_failed: false,
            num_biomarkers: NUM_BIOMARKERS_SERVER,
            num_diseases: NUM_DISEASES_SERVER,
            num_users: NUM_USERS_SERVER
        });
    }
    else {
        biomarkerName = biomarkerName.toUpperCase();
        var medium = "";
        var type = "";

        //MySQL Dynamic Read
        querystring = "SELECT fk_Biomolecules FROM Biomolecule_Names WHERE Name=?;";
        pool.query(querystring, [biomarkerName], function(err, rows, fields) {
            if (err) {
                throw err;
                return;
            }

            if( !(typeof rows != "undefined" && rows != null && rows.length > 0) ) {
                response.render('pages/index', {
                    search_failed: true,
                    biomarkerName: biomarkerName,
                    num_biomarkers: NUM_BIOMARKERS_SERVER,
                    num_diseases: NUM_DISEASES_SERVER,
                    num_users: NUM_USERS_SERVER
                });
            }
            else {
                querystring = "SELECT * from Biomolecules WHERE pk_Biomolecules=?;";
                pool.query(querystring, [rows[0].fk_Biomolecules], function(err, rows, fields) {
                    if (err) {
                        throw err;
                        return;
                    }

                    console.log(rows[0]);
                    querystring = "SELECT Medium from Biomolecule_Medium WHERE pk_Biomolecule_Medium=?; " +
                                    "SELECT Type from Biomolecule_Type WHERE pk_Biomolecule_Type=?;";
                    pool.query(querystring, [rows[0].fk_Biomolecule_Medium, rows[0].fk_Biomolecule_Type], function(err, rows, fields) {
                        if (err) {
                            throw err;
                            return;
                        }

                        medium = rows[0][0]["Medium"];
                        type = rows[1][0]["Type"];
                        console.log("medium: " + medium + "type: " + type);
                    });
                });
            }
        });


        /* JSON STATIC READ
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
                biomarkerName: biomarkerName,
                num_biomarkers: NUM_BIOMARKERS_SERVER,
                num_diseases: NUM_DISEASES_SERVER,
                num_users: NUM_USERS_SERVER
            });
        }
        */
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
    if (true) {
        response.render('pages/login', {
            login_problem_text: "Account not found. Please try again."
        });
    }
    else {
        response.render('pages/index', {
            num_biomarkers: NUM_BIOMARKERS_SERVER,
            num_diseases: NUM_DISEASES_SERVER,
            num_users: NUM_USERS_SERVER
        });
    }
});

//routing signup
app.get('/signup', function (request, response) {
    response.render('pages/signup');
    console.log('got a GET request from signup');
});
app.post('/signup', function (request, response) {
    console.log("got a signup POST request");
    if (request.body.user.pwd !== request.body.user.repeatpwd) {
        response.render('pages/signup', {
            create_account_problem_text: "Passwords did not match. Please try again."
        });
    }
    else if (request.body.user.pwd.length < 5) {
        response.render('pages/signup', {
            create_account_problem_text: "Password must contain at least 5 characters. Please try again."
        });
    }
    else {
        response.render('pages/account_creation/success', {
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

//end mysql pool
process.on('exit', function(code) {
    pool.end();
});
