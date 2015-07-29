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
    biomarkerName = biomarkerName.toUpperCase();
    var biomarkerInfo = {
        Name: biomarkerName
    };

    querystring = "SELECT fk_Biomolecules FROM Biomolecule_Names WHERE Name=?;"; //? used to prevent SQL injection
    pool.query(querystring, [biomarkerName], function(err, rows, fields) {
        if (err) {
            throw err;
            return;
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
            querystring = "SELECT * from Biomolecules WHERE pk_Biomolecules=" + rows[0].fk_Biomolecules + ";" +
                            "SELECT Name from Biomolecule_Names where fk_Biomolecules=" + rows[0].fk_Biomolecules + ";";
            pool.query(querystring, function(err, rows, fields) {
                if (err) {
                    throw err;
                    return;
                }
                biomarkerInfo["Alternate Names"] = [];
                for(var jsonE in rows[1]) {
                    biomarkerInfo["Alternate Names"].push(rows[1][jsonE].Name);
                }

                querystring = "SELECT Medium from Biomolecule_Medium WHERE pk_Biomolecule_Medium=" + rows[0][0].fk_Biomolecule_Medium + ";" +
                                "SELECT Type from Biomolecule_Type WHERE pk_Biomolecule_Type=" + rows[0][0].fk_Biomolecule_Type + ";";
                pool.query(querystring, [rows[0][0].fk_Biomolecule_Medium, rows[0][0].fk_Biomolecule_Type], function(err, rows, fields) {
                    if (err) {
                        throw err;
                        return;
                    }

                    biomarkerInfo['Medium'] = rows[0][0]['Medium'];
                    biomarkerInfo['Type'] = rows[1][0]['Type'];

                    callback(biomarkerInfo);
                });
            });
        }
    });
}

module.exports.getHomepageNumbers = getHomepageNumbers;
module.exports.getDossierInfo = getDossierInfo;
