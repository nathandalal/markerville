var server = require("./server.js");
var md5 = require('blueimp-md5').md5;
var sha256 = require('sha256');
var fs = require('fs'); //needed to read connection json file

//msyql setup
var mysql = require('mysql');

//create mysql pool
var pool = mysql.createPool(JSON.parse(fs.readFileSync("./static/private_json/mysql_connection.json", "utf8")));

function getHomepageNumbers(callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }

        var querystring = "SELECT COUNT(*) FROM Biomolecules;" +
                          "SELECT COUNT(*) FROM Diseases;" +
                          "SELECT COUNT(*) FROM Users;";
        connection.query(querystring, function(err, rows, fields) {
            if (err) {
                throw err;
                return null;
            }

            callback ({
                NUM_BIOMARKERS_SERVER: rows[0][0]["COUNT(*)"],
                NUM_DISEASES_SERVER: rows[1][0]["COUNT(*)"],
                NUM_USERS_SERVER: rows[2][0]["COUNT(*)"]
            });
        });

        connection.release();
    });
}


function getDossierInfo(loggedIn, emailIfLoggedIn, biomarkerName, response, callback) {
    var querystring = "";
    var biomarkerInfo = {
        Name: biomarkerName
    };

    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }

        querystring = "SELECT fk_Biomolecules FROM Biomolecule_Names WHERE Name=?;"; //? used to prevent SQL injection
        connection.query(querystring, [biomarkerName], function(err, rows, fields) {
            if (err) {
                throw err;
            }

            if( !(typeof rows != "undefined" && rows != null && rows.length > 0) ) {
                //find all biomarkers in disease if search is a disease name
                getDiseaseDisambiguation(loggedIn, emailIfLoggedIn, biomarkerName, response, function() {
                    response.render('pages/index', {
                        search_failed: true,
                        biomarkerName: biomarkerName,
                        num_biomarkers: server.homepageStats.NUM_BIOMARKERS_SERVER,
                        num_diseases: server.homepageStats.NUM_DISEASES_SERVER,
                        num_users: server.homepageStats.NUM_USERS_SERVER,
                        logged_in: loggedIn,
                        email: emailIfLoggedIn
                    });
                });
            }
            else {
                biomarkerInfo["Biomolecule MySQL ID"] = rows[0].fk_Biomolecules;

                querystring = "SELECT * from Biomolecules WHERE pk_Biomolecules=" + rows[0].fk_Biomolecules + ";" +
                              "SELECT Name from Biomolecule_Names where fk_Biomolecules=" + rows[0].fk_Biomolecules + ";" +
                              "SELECT * from Biomolecules_Sources_Association where fk_Biomolecules=" + rows[0].fk_Biomolecules + ";";
                connection.query(querystring, function(err, rows, fields) {
                    if (err) {
                        throw err;
                    }

                    //flat arrays
                    biomarkerInfo["Alternate Names"] = [];

                    //getting alternate names for biomarker
                    for(var jsonE in rows[1]) {
                        var newName = rows[1][jsonE].Name;
                        if(biomarkerName.toUpperCase() !== newName.toUpperCase())
                            biomarkerInfo["Alternate Names"].push(newName);
                        else
                            biomarkerInfo['Name'] = newName;
                    }

                    //array of objects
                    biomarkerInfo["Sources"] = [{}];

                    //could be multiple sources for one biomarker - begin reading info into sources section of biomarkerInfo
                    for(var jsonE in rows[2]) {

                        if(jsonE > 0)
                            biomarkerInfo['Sources'][jsonE] = {};
                        biomarkerInfo['Sources'][jsonE]["Source MySQL ID"] = rows[2][jsonE].fk_Sources;

                        //load array of trial objects into individual paper object
                        biomarkerInfo['Sources'][jsonE]["Trials"] = [];
                        querystring = "SELECT * from Trial WHERE fk_Sources=" + rows[2][jsonE].fk_Sources + ";";
                        connection.query(querystring, function(err, rows, fields) {
                            if (err) {
                                throw err;
                            }

                            for (var i = 0; i < rows.length; i++) {
                                var numPatients = rows[i].Patients;
                                querystring = "SELECT Discovery_Method from Discovery_Method WHERE pk_Discovery_Method=" + rows[i].fk_Discovery_Method + ";";
                                connection.query(querystring, function(err, rows, fields) {
                                    if (err) {
                                        throw err;
                                    }

                                    biomarkerInfo['Sources'][jsonE]["Trials"].push({
                                        '# Patients': numPatients,
                                        'Discovery Method': rows[0].Discovery_Method
                                    });
                                });
                            }

                        });

                        //create flat arr of other biomarkers
                        biomarkerInfo['Sources'][jsonE]["Other Biomarkers"] = [];

                        biomarkerInfo["Sources"][jsonE]["Biomolecule State"] = rows[2][jsonE].Biomolecule_State;
                        biomarkerInfo["Sources"][jsonE]["Drug Name"] = rows[2][jsonE].Drug_Name;

                        querystring = "SELECT Disease from Diseases WHERE pk_Diseases=" + rows[2][jsonE].fk_Diseases + ";" +
                                      "SELECT Purpose FROM Biomarker_Purpose WHERE pk_Biomarker_Purpose=" + rows[2][jsonE].fk_Biomarker_Purpose + ";" +
                                      "SELECT * FROM Sources WHERE pk_Sources=" + rows[2][jsonE].fk_Sources + ";" +
                                      "SELECT fk_Biomolecules FROM Biomolecules_Sources_Association WHERE fk_Sources=" + rows[2][jsonE].fk_Sources + ";";
                        connection.query(querystring, function(err, rows, fields) {
                            if (err) {
                                throw err;
                            }

                            biomarkerInfo['Sources'][jsonE]["Disease"] = rows[0][jsonE].Disease;
                            biomarkerInfo['Sources'][jsonE]["Purpose"] = rows[1][jsonE].Purpose;
                            biomarkerInfo['Sources'][jsonE]["Google ID"] = rows[2][jsonE].Google_ID;
                            biomarkerInfo['Sources'][jsonE]["URL"] = rows[2][jsonE].URL;

                            querystring = "SELECT Source_Type from Source_Type WHERE pk_Source_Type=" + rows[2][jsonE].fk_Source_Type + ";" +
                                          "SELECT Original_Source_Database from Original_Source_Databases WHERE pk_Original_Source_Databases=" + rows[2][jsonE].fk_Original_Source_Databases + ";";
                            //getting all other biomarkers associated w source
                            for(var i = 0; i < rows[3].length; i++)
                                querystring += "SELECT Name, fk_Biomolecules from Biomolecule_Names WHERE fk_Biomolecules=" + rows[3][i].fk_Biomolecules + " LIMIT 1 ;";
                            connection.query(querystring, function(err, rows, fields) {
                                if (err) {
                                    throw err;
                                }

                                biomarkerInfo['Sources'][jsonE]["Source Type"] = rows[0][jsonE].Source_Type;
                                biomarkerInfo['Sources'][jsonE]["Original Source Database"] = rows[1][jsonE].Original_Source_Database;

                                //adding all other biomarkers associated w paper, excluding current one
                                for(var i = 2; i < rows.length; i++) {
                                    if(biomarkerInfo["Biomolecule MySQL ID"] != rows[i][0].fk_Biomolecules)
                                        biomarkerInfo['Sources'][jsonE]["Other Biomarkers"].push(rows[i][0].Name);
                                }

                                //send info to server.js to display to view - put here because this is the longer query cascade
                                callback(biomarkerInfo);
                            });
                        });
                    }

                    querystring = "SELECT Medium from Biomolecule_Medium WHERE pk_Biomolecule_Medium=" + rows[0][0].fk_Biomolecule_Medium + ";" +
                                  "SELECT Type from Biomolecule_Type WHERE pk_Biomolecule_Type=" + rows[0][0].fk_Biomolecule_Type + ";";
                    connection.query(querystring, function(err, rows, fields) {
                        if (err) {
                            throw err;
                        }

                        biomarkerInfo['Medium'] = rows[0][0]['Medium'];
                        biomarkerInfo['Type'] = rows[1][0]['Type'];
                    });
                });
            }
        });
    });
}

function getSQLDate(callback) {
    var currentDayTwoDigits = new Date().getMonth() + 1;
    if (currentDayTwoDigits < 10)
        currentDayTwoDigits = "0" + currentDayTwoDigits.toString();
    currentDate = new Date().getFullYear().toString() + "-" + currentDayTwoDigits + "-" + new Date().getDate().toString();
    callback(currentDate);
}

function createUnverifiedAccount(accountInfo, response, callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }

        querystring = "SELECT * FROM Users WHERE email=?;";
        connection.query(querystring, [accountInfo.email], function(err, rows, fields) {
            if(typeof rows != "undefined" && rows != null && rows.length > 0) {
                response.render('pages/account-creation/signup', {
                    create_account_problem_text: "An account with the entered email already exists. Please try again.",
                    logged_in: false
                });
            }
            else {

                querystring = "INSERT INTO Users (firstName, lastName, email, pass, date_signed_up, hash, verified) " +
                              "VALUES (?, ?, ?, ?, ?, ?, false);";
                getSQLDate(function(currentDate) {
                    accountInfo.date = currentDate;
                    accountInfo.hash = md5(accountInfo.lastName + accountInfo.email);
                    connection.query(querystring, [accountInfo.firstName, accountInfo.lastName, accountInfo.email, sha256(accountInfo.email + accountInfo.pass), accountInfo.date, accountInfo.hash], function(err, rows, fields) {
                        if (err) {
                            throw err;
                        }
                        console.log("user with email " + accountInfo.email + " created unverified account.");
                        callback(); //created to success, success view on server.js
                    });
                });
            }   
        });
    });
}

function verifyAccount(accountInfo, response, callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }

        var validFields = true;

        if (accountInfo.email == undefined) {
            validFields = false;
            response.render("pages/account-creation/verify-account", {
                create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation.",
                logged_in: false
            });
            callback();
        }
        if (accountInfo.hash == undefined) {
            validFields = false;
            response.render("pages/account-creation/verify-account", {
                create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation.",
                logged_in: false
            });
            callback();
        }

        if(validFields)
        {
            querystring = "SELECT * FROM Users WHERE email=? AND hash=?;";
            connection.query(querystring, [accountInfo.email, accountInfo.hash], function(err, rows, fields) {
                if (err) {
                    throw err;
                }

                if(!(typeof rows != "undefined" && rows != null && rows.length > 0)) {
                    response.render("pages/account-creation/verify-account", {
                        create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation.",
                        logged_in: false
                    });
                }
                else {
                    accountInfo.name = rows[0].firstName;

                    querystring = "UPDATE Users SET verified=true WHERE email=? AND hash=?;";
                    connection.query(querystring, [accountInfo.email, accountInfo.hash], function(err, rows, fields) {
                        if (err) {
                            throw err;
                        }
                        response.render("pages/account-creation/verify-account", {
                            name: accountInfo.name,
                            email: accountInfo.email,
                            logged_in: false
                        }); //success
                        console.log("account with email " + accountInfo.email + " verified");
                    });
                }
                callback();
            });
        }
    });
}

function loginUser(accountInfo, response, callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }
        querystring = "SELECT * FROM Users WHERE email=? AND pass=?;";
        connection.query(querystring, [accountInfo.email, sha256(accountInfo.email + accountInfo.pass)], function(err, rows, fields) {
            if (err) {
                throw err;
            }

            if(!(typeof rows != "undefined" && rows != null && rows.length > 0)) {
                response.render('pages/login', {
                    login_problem_text: "Invalid login. Please try again.",
                    logged_in: false
                });
            }
            else if(rows[0].verified == 0) {
                response.render('pages/account-creation/unverified', {
                    email: accountInfo.email,
                    sendingVerificationEmail: false,
                    logged_in: false
                }); 
            }
            else {
                callback();
            }
        });
    });
}

function getAccountInfo(email, callback) {
    var accountInfo = {};
    accountInfo.email = email;
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }
        var querystring = "SELECT * FROM Users WHERE email=?;";
        connection.query(querystring, [accountInfo.email], function(err, rows, fields) {
            accountInfo.firstName = rows[0].firstName;
            accountInfo.lastName = rows[0].lastName;
            callback(accountInfo);
        });
    });
}

function getEditingInfo(callback) {
    var editingInfo = {
        biomoleculeMediumList: [],
        biomoleculeTypeList: [],
        sourceTypeList: [],
        sourceOriginalDatabaseList: [],
        sourcePurposeList: [],
        sourceDiseaseList: [],
        sourceDiscoveryMethodList: []
    };
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }
        var querystring = "SELECT Medium FROM Biomolecule_Medium;" +
                        "SELECT Type FROM Biomolecule_Type;" +
                        "SELECT Source_Type FROM Source_Type;" +
                        "SELECT Original_Source_Database FROM Original_Source_Databases;" +
                        "SELECT Purpose FROM Biomarker_Purpose;" +
                        "SELECT Disease FROM Diseases;" +
                        "SELECT Discovery_Method from Discovery_Method;";
        connection.query(querystring, function(err, rows, fields) {
            if (err) {
                throw err;
            }

            for(var i=0; i<rows[0].length; i++) {
                editingInfo.biomoleculeMediumList.push(rows[0][i].Medium);
            }
            for(var i=0; i<rows[1].length; i++) {
                editingInfo.biomoleculeTypeList.push(rows[1][i].Type);
            }
            for(var i=0; i<rows[2].length; i++) {
                editingInfo.sourceTypeList.push(rows[2][i].Source_Type);
            }
            for(var i=0; i<rows[3].length; i++) {
                editingInfo.sourceOriginalDatabaseList.push(rows[3][i].Original_Source_Database);
            }
            for(var i=0; i<rows[4].length; i++) {
                editingInfo.sourcePurposeList.push(rows[4][i].Purpose);
            }
            for(var i=0; i<rows[5].length; i++) {
                editingInfo.sourceDiseaseList.push(rows[5][i].Disease);
            }
            for(var i=0; i<rows[6].length; i++) {
                editingInfo.sourceDiscoveryMethodList.push(rows[6][i].Discovery_Method);
            }

            callback(editingInfo);
        });
    });
}

function checkIfBiomarkerExists(biomoleculeNames, callback) {
    var failed = false;
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }

        for(var i=0; i<biomarkerInfo.biomoleculeNames.length; i++) {
            var querystring = "SELECT Name FROM Biomolecule_Names WHERE Name=?;";
            connection.query(querystring, [biomarkerInfo.biomoleculeNames[i]], function(err, rows, fields) {
                if(err) {
                    throw err;
                }
                
                if(typeof rows != "undefined" && rows != null && rows.length > 0) {
                    response.render("pages/found-biomarker-while-editing", {
                        biomarkerName: rows[0].Name,
                        logged_in: loggedIn,
                        email: emailIfLoggedIn
                    });//response.render
                    failed = true;
                    callback(failed);
                    return;
                }
            });
            console.log(i);
        }
    });
}

function addNewBiomarker(loggedIn, emailIfLoggedIn, biomarkerInfo, response, callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }
        var querystring = "SELECT Name FROM Biomolecule_Names WHERE ";
        for(var i=0; i<biomarkerInfo.biomoleculeNames.length; i++) {
            querystring += "Name= " + connection.escape(biomarkerInfo.biomoleculeNames[i]) + " OR ";
        }
        querystring = querystring.slice(0,querystring.length-4) + ";";
        connection.query(querystring, function(err, rows, fields) {
            if(err) {
                throw err;
            }

            if (typeof rows != "undefined" && rows != null && rows.length > 0) {
                var conflictingNames = [];
                for(var nameElement in rows) {
                    conflictingNames.push(rows[nameElement].Name);
                }
                response.render("pages/found-biomarker-while-editing", {
                    biomarkerNames: conflictingNames,
                    logged_in: loggedIn,
                    email: emailIfLoggedIn
                });
            } else {
                console.log("request to add biomarker passed db check");
                querystring = "";
                connection.query(querystring, function(err, rows, fields) {
                    if(err) {
                        throw err;
                    }

                                        
                });
            }
        });
    });
}

function getDiseaseDisambiguation(loggedIn, emailIfLoggedIn, diseaseName, response, callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }
        var querystring = "SELECT pk_Diseases FROM Diseases WHERE Disease=?;";
        connection.query(querystring, [diseaseName], function(err, rows, fields) {
            if(err) {
                throw err;
            }

            if( !(typeof rows != "undefined" && rows != null && rows.length > 0) ) {
                callback(); //failure
            } else {
                querystring = "SELECT fk_Biomolecules FROM Biomolecules_Sources_Association WHERE fk_Diseases=?;";
                connection.query(querystring, [rows[0].pk_Diseases], function(err, rows, fields) {
                    if(err) {
                        throw err;
                    }

                    var numBiomarkers = rows.length;
                    var names = [];
                    var querystring = "SELECT Name FROM Biomolecule_Names WHERE ";
                    for(var i=0; i<numBiomarkers; i++) {
                        querystring += "fk_Biomolecules=" + rows[i].fk_Biomolecules + " OR ";
                    }
                    querystring = querystring.slice(0,querystring.length-4) + " ORDER BY Name;";
                    connection.query(querystring, function(err, rows, fields) {
                        if(err) {
                            throw err;
                        }

                        for(var i=0; i<rows.length; i++) {
                            names.push(rows[i].Name);
                        }

                        response.render('pages/disambiguation', {
                            disease: diseaseName,
                            numBiomarkers: numBiomarkers,
                            names: names,
                            logged_in: loggedIn,
                            email: emailIfLoggedIn
                        });//response.render
                    });//query
                });//query
            }
        });//query
    });//connection
}//end function

function getDiseaseList(callback) {
    pool.getConnection(function(err, connection) {
        if(err) {
            throw err;
        }
        var querystring = "SELECT Disease FROM Diseases;";
        connection.query(querystring, function(err, rows, fields) {
            if(err) {
                throw err;
            }
            var diseases = [];
            for(var i=0; i<rows.length; i++) {
                diseases.push(rows[i].Disease);
            }
            callback(diseases);
        });
    });
}

module.exports.loginUser = loginUser;
module.exports.getHomepageNumbers = getHomepageNumbers;
module.exports.getDossierInfo = getDossierInfo;
module.exports.createUnverifiedAccount = createUnverifiedAccount;
module.exports.verifyAccount = verifyAccount;
module.exports.getAccountInfo = getAccountInfo;
module.exports.getEditingInfo = getEditingInfo;
module.exports.getDiseaseList = getDiseaseList;
module.exports.addNewBiomarker = addNewBiomarker;
