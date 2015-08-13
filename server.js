var queries = require("./queries.js");
var mailer = require("./mailer.js");

var querystring = "";
var port = 7777;

//express setup
var express = require('express');
var app = express();

//add body parser to read post requests, cookie parser to read cookies
var bodyParser = require('body-parser');
app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
var cookieParser = require('cookie-parser');
app.use(cookieParser());

//set view engine to ejs
app.set('view engine', 'ejs');

//give static access to 'static' directory
app.use(express.static('static'));

queries.getHomepageNumbers(function(homepageStats) {
    module.exports.homepageStats = homepageStats;

    //routing index
    app.get('/', function (request, response) {
        console.log('got a GET request from index');
        var loggedIn = (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined);

        var biomarkerName = request.query['biomarker'];
        if (biomarkerName == undefined) {
            response.render('pages/index', {
                search_failed: false,
                num_biomarkers: homepageStats.NUM_BIOMARKERS_SERVER,
                num_diseases: homepageStats.NUM_DISEASES_SERVER,
                num_users: homepageStats.NUM_USERS_SERVER,
                logged_in: loggedIn,
                email: request.cookies.email
            });
        }
        else {
            queries.getDossierInfo(loggedIn, request.cookies.email, biomarkerName, response, function(biomarkerInfo) {
                console.log("search returned:");
                console.log(biomarkerInfo);
                response.render('pages/dossier', {
                    biomarkerInfo: biomarkerInfo,
                    logged_in: loggedIn,
                    email: request.cookies.email
                });
            });
        }
    });
    
    //routing editor mode
    app.get('/contribute', function (request, response) {
        console.log('got a GET request from edit');
        var loggedIn = (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined);
        if (!loggedIn) {
            response.render('pages/already_logout', {
                logged_in: false
            });
        } else {
            queries.getEditingInfo(function(editingInfo) {
                response.render('pages/edit-main', {
                    logged_in: true,
                    email: request.cookies.email,
                    editingInfo: editingInfo
                });
            });
        }
    });
    app.post('/contribute', function (request, response) {
        console.log('got a contribute POST request');
        var loggedIn = (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined);
        if (!loggedIn) {
            response.render('pages/already_logout', {
                logged_in: false
            });
        } else {
            console.log(request.body);
            queries.addNewBiomarker(loggedIn, request.cookies.email, request.body, response, function() {
                //do something after biomarker is added
                console.log('done');
            });
        }
    });

    //routing about
    app.get("/about", function (request, response) {
        console.log('got a GET request from about');
        response.render('pages/about', {
            logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
            email: request.cookies.email
        });
    });

    //routing by-disease
    app.get("/by-disease", function (request, response) {
        console.log('got a GET request from by-disease');
        queries.getDiseaseList(function(diseases) {
            response.render('pages/by-disease', {
                diseases: diseases,
                logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
                email: request.cookies.email
            });
        });
    });

    //routing account-info
    app.get("/account-info", function (request, response) {
        console.log('got a GET request from account-info');
        var loggedIn = (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined);
        if (loggedIn) {
            queries.getAccountInfo(request.cookies.email, function(accountInfo) {
                response.render('pages/account-info', {
                    accountInfo: accountInfo,
                    logged_in: true,
                    email: request.cookies.email
                });
            })
        } else {
            response.render('pages/already_logout', {
                logged_in: false
            });
        }
    });

    //routing login
    app.get("/login", function (request, response) {
        console.log('got a GET request from login');
        var loggedIn = (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined);
        if(!loggedIn) {
            response.render('pages/login', {
                logged_in: false
            });
        } else {
            response.render('pages/already_login', {
                logged_in: true,
                email: request.cookies.email
            });
        }
    });
    app.post('/login', function (request, response) {
        console.log("got a login POST request");

        queries.loginUser({
            email: request.body.user.email,
            pass: request.body.user.pwd
        }, response, function() {
            //do something, set a cookie, whatever
            response.cookie('email', request.body.user.email);
            response.redirect("../"); //redirect to index
        });
    });

    app.get('/logout', function (request, response) {
        console.log("got a GET request from logout");
        var email_address = request.cookies.email;
        if(typeof request.cookies.email !='undefined' && request.cookies.email !=undefined) {
            response.clearCookie("email");
            response.redirect("/");
        }
    });

    //routing signup
    app.get('/signup', function (request, response) {
        response.render('pages/account-creation/signup', {
            logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
            email: request.cookies.email
        });
        console.log('got a GET request from account-creation/signup');
    });
    app.post('/signup', function (request, response) {
        console.log("got a account-creation/signup POST request");
        if (request.body.user.pwd !== request.body.user.repeatpwd) {
            response.render('pages/account-creation/signup', {
                create_account_problem_text: "Passwords did not match. Please try again.",
                logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
                email: request.cookies.email
            });
        }
        else if (request.body.user.firstname.length == 0) {
            response.render('pages/account-creation/signup', {
                create_account_problem_text: "First Name is a required field and is left blank.",
                logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
                email: request.cookies.email
            });
        }
        else if (request.body.user.lastname.length == 0) {
            response.render('pages/account-creation/signup', {
                create_account_problem_text: "Last Name is a required field and is left blank.",
                logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
                email: request.cookies.email
            });
        }
        else if (request.body.user.pwd.length < 5) {
            response.render('pages/account-creation/signup', {
                create_account_problem_text: "Password must contain at least 5 characters. Please try again.",
                logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
                email: request.cookies.email
            });
        }
        else {
            accountInfo = {
                firstName: request.body.user.firstname,
                lastName: request.body.user.lastname,
                email: request.body.user.email,
                pass: request.body.user.pwd
            }

            queries.createUnverifiedAccount(accountInfo, response, function() {
                response.render('pages/account-creation/unverified', {
                    email: request.body.user.email,
                    sendingVerificationEmail: true,
                    logged_in: false
                });

                mailer.sendVerificationEmail(accountInfo, function() {
                    //do something after email is sent
                });
            });
        }
    });

    //routing account-creation/verify-account (users come here from email message)
    app.get("/account-creation/verify-account", function (request, response) {
        console.log('got a GET request from account-creation/verify-account');

        queries.verifyAccount({
            email: request.query.email,
            hash: request.query.hash
        }, response, function() { 
            //do something??
        });
    });

    // routing 404 event
    app.use(function (request, response) {
        response.status(400);
        response.render('pages/404', {
            logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
            email: request.cookies.email
        });
    });
      
    // routing 500 event
    app.use(function (error, request, response, next) {
        response.status(500);
        response.render('pages/500', {
            logged_in: (typeof request.cookies.email !='undefined' && request.cookies.email !=undefined),
            email: request.cookies.email
        });
        console.log("Internal server error: \n" + error);
    });

}); //from getHomepageNumbers

//listen on localhost
app.listen(port);
console.log('listening on http://localhost:' + port);

//end mysql pool
process.on('exit', function(code) {
    pool.end();
});
