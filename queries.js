var server = require("./server.js");
var md5 = require('blueimp-md5').md5;
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


function getDossierInfo(biomarkerName, response, callback) {
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
                response.render('pages/index', {
                    search_failed: true,
                    biomarkerName: biomarkerName,
                    num_biomarkers: server.homepageStats.NUM_BIOMARKERS_SERVER,
                    num_diseases: server.homepageStats.NUM_DISEASES_SERVER,
                    num_users: server.homepageStats.NUM_USERS_SERVER
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

function getSQLDate() {
    var currentDayTwoDigits = new Date().getMonth() + 1;
    if (currentDayTwoDigits < 10)
        currentDayTwoDigits = "0" + currentDayTwoDigits.toString();
    var currentDate = new Date().getFullYear().toString() + "-" + currentDayTwoDigits + "-" + new Date().getDate().toString();
    return currentDate;
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
                    create_account_problem_text: "An account with the entered email already exists. Please try again."
                });
            }
            else {

                querystring = "INSERT INTO Users (firstName, lastName, email, pass, date_signed_up, hash, verified) " +
                              "VALUES (?, ?, ?, ?, ?, ?, false);";
                connection.query(querystring, [accountInfo.firstName, accountInfo.lastName, accountInfo.email, accountInfo.pass, this.getSQLDate(), md5(accountInfo.lastName + accountInfo.email)], function(err, rows, fields) {
                    if (err) {
                        throw err;
                    }

                    callback(); //created to success, success view on server.js
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

        if (accountInfo.email == undefined && validFields) {
            validFields = false;
            response.render("pages/account-creation/verify-account", {
                create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation."
            });
            callback();
        }
        if (accountInfo.pass == undefined && validFields) {
            validFields = false;
            response.render("pages/account-creation/verify-account", {
                create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation."
            });
            callback();
        }
        if (accountInfo.hash == undefined && validFields) {
            validFields = false;
            response.render("pages/account-creation/verify-account", {
                create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation."
            });
            callback();
        }

        if(validFields)
        {
            querystring = "SELECT * FROM Users WHERE email=? AND pass=? AND hash=?;";
            connection.query(querystring, [accountInfo.email, accountInfo.pass, accountInfo.hash], function(err, rows, fields) {
                if (err) {
                    throw err;
                }

                if(!(typeof rows != "undefined" && rows != null && rows.length > 0)) {
                    response.render("pages/account-creation/verify-account", {
                        create_account_problem_text: "Whoops, something went wrong. Sorry! Please contact us with details about your account creation."
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
                            email: accountInfo.email
                        }); //success
                        console.log("account with email " + accountInfo.email + " verified");
                    });
                }
                callback();
            });
        }
    });
}

module.exports.getHomepageNumbers = getHomepageNumbers;
module.exports.getDossierInfo = getDossierInfo;
module.exports.createUnverifiedAccount = createUnverifiedAccount;
module.exports.verifyAccount = verifyAccount;
