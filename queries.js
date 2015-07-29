var server = require("./server.js")

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

function getHomepageNumbers(callback) {
    var querystring = "SELECT COUNT(*) FROM Biomolecules;" +
                        "SELECT COUNT(*) FROM Diseases;" +
                        "SELECT COUNT(*) FROM Users;";

    pool.query(querystring, function(err, rows, fields) {
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
}

function getDossierInfo(biomarkerName, response, callback) {
    var biomarkerInfo = {
        Name: biomarkerName
    };

    querystring = "SELECT fk_Biomolecules FROM Biomolecule_Names WHERE Name=?;"; //? used to prevent SQL injection
    pool.query(querystring, [biomarkerName], function(err, rows, fields) {
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
            biomarkerInfo["Biomarker MySQL ID"] = rows[0].fk_Biomolecules;

            querystring = "SELECT * from Biomolecules WHERE pk_Biomolecules=" + rows[0].fk_Biomolecules + ";" +
                            "SELECT Name from Biomolecule_Names where fk_Biomolecules=" + rows[0].fk_Biomolecules + ";" +
                            "SELECT * from Biomolecules_Sources_Association where fk_Biomolecules=" + rows[0].fk_Biomolecules + ";";
            pool.query(querystring, function(err, rows, fields) {
                if (err) {
                    throw err;
                }

                //flat arrays
                biomarkerInfo["Alternate Names"] = [];

                //array of objects
                biomarkerInfo["Papers"] = [{}];

                //getting alternate names for biomarker
                for(var jsonE in rows[1]) {
                    var newName = rows[1][jsonE].Name;
                    if(biomarkerName.toUpperCase() !== newName.toUpperCase())
                        biomarkerInfo["Alternate Names"].push(newName);
                    else
                        biomarkerInfo['Name'] = newName;
                }

                //could be multiple papers for one biomarker - begin reading info into papers section of biomarkerInfo
                for(var jsonE in rows[2]) {
                    //load array of trial objects into individual paper object
                    biomarkerInfo['Papers'][jsonE]["Trials"] = [];
                    querystring = "SELECT * from Trial WHERE fk_Sources=" + rows[2][jsonE].fk_Sources + ";";
                    pool.query(querystring, function(err, rows, fields) {
                        if (err) {
                            throw err;
                        }

                        for (var i = 0; i < rows.length; i++) {
                            var numPatients = rows[i].Patients;
                            querystring = "SELECT Discovery_Method from Discovery_Method WHERE pk_Discovery_Method=" + rows[i].fk_Discovery_Method + ";";
                            pool.query(querystring, function(err, rows, fields) {
                                if (err) {
                                    throw err;
                                }

                                biomarkerInfo['Papers'][jsonE]["Trials"].push({
                                    '# Patients': numPatients,
                                    'Discovery Method': rows[0].Discovery_Method
                                });
                            });
                        }

                    });

                    //create flat arr of other biomarkers
                    biomarkerInfo['Papers'][jsonE]["Other Biomarkers"] = [];

                    biomarkerInfo["Papers"][jsonE]["Biomolecule State"] = rows[2][jsonE].Biomolecule_State;
                    biomarkerInfo["Papers"][jsonE]["Drug Name"] = rows[2][jsonE].Drug_Name;

                    querystring = "SELECT Disease from Diseases WHERE pk_Diseases=" + rows[2][jsonE].fk_Diseases + ";" +
                                    "SELECT Purpose FROM Biomarker_Purpose WHERE pk_Biomarker_Purpose=" + rows[2][jsonE].fk_Biomarker_Purpose + ";" +
                                    "SELECT * FROM Sources WHERE pk_Sources=" + rows[2][jsonE].fk_Sources + ";" +
                                    "SELECT fk_Biomolecules FROM Biomolecules_Sources_Association WHERE fk_Sources=" + rows[2][jsonE].fk_Sources + ";";
                    pool.query(querystring, function(err, rows, fields) {
                        if (err) {
                            throw err;
                        }

                        biomarkerInfo['Papers'][jsonE]["Disease"] = rows[0][jsonE].Disease;
                        biomarkerInfo['Papers'][jsonE]["Purpose"] = rows[1][jsonE].Purpose;
                        biomarkerInfo['Papers'][jsonE]["Google ID"] = rows[2][jsonE].Google_ID;
                        biomarkerInfo['Papers'][jsonE]["URL"] = rows[2][jsonE].URL;

                        querystring = "SELECT Source_Type from Source_Type WHERE pk_Source_Type=" + rows[2][jsonE].fk_Source_Type + ";" +
                                        "SELECT Original_Source_Database from Original_Source_Databases WHERE pk_Original_Source_Databases=" + rows[2][jsonE].fk_Original_Source_Databases + ";";
                        //getting all other biomarkers associated w source
                        for(var i = 0; i < rows[3].length; i++)
                            querystring += "SELECT Name, fk_Biomolecules from Biomolecule_Names WHERE fk_Biomolecules=" + rows[3][i].fk_Biomolecules + " LIMIT 1 ;";
                        pool.query(querystring, function(err, rows, fields) {
                            if (err) {
                                throw err;
                            }

                            biomarkerInfo['Papers'][jsonE]["Source Type"] = rows[0][jsonE].Source_Type;
                            biomarkerInfo['Papers'][jsonE]["Original Source Database"] = rows[1][jsonE].Original_Source_Database;

                            //adding all other biomarkers associated w paper, excluding current one
                            for(var i = 2; i < rows.length; i++) {
                                if(biomarkerInfo["Biomarker MySQL ID"] != rows[i][0].fk_Biomolecules)
                                    biomarkerInfo['Papers'][jsonE]["Other Biomarkers"].push(rows[i][0].Name);
                            }

                            //send info to server.js to display to view - put here because this is the longer query cascade
                            callback(biomarkerInfo);
                        });
                    });
                }

                querystring = "SELECT Medium from Biomolecule_Medium WHERE pk_Biomolecule_Medium=" + rows[0][0].fk_Biomolecule_Medium + ";" +
                                "SELECT Type from Biomolecule_Type WHERE pk_Biomolecule_Type=" + rows[0][0].fk_Biomolecule_Type + ";";
                pool.query(querystring, function(err, rows, fields) {
                    if (err) {
                        throw err;
                    }

                    biomarkerInfo['Medium'] = rows[0][0]['Medium'];
                    biomarkerInfo['Type'] = rows[1][0]['Type'];
                });
            });
        }
    });
}

module.exports.getHomepageNumbers = getHomepageNumbers;
module.exports.getDossierInfo = getDossierInfo;
