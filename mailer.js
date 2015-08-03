var nodemailer = require('nodemailer');
var fs = require('fs');

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: JSON.parse(fs.readFileSync("./static/private_json/email_info.json", "utf8"))
});


function sendVerificationEmail(accountInfo, callback) {

    var encodedURIOptions = "email=" + encodeURIComponent(accountInfo.email) + 
                            "&hash=" + encodeURIComponent(accountInfo.hash);

    var mailOptions = {
        from: 'Markerville Team <nathanhdalal@gmail.com>', // sender address - the email indicated here is useless
        to: accountInfo.firstName + " " + accountInfo.lastName + " <" + accountInfo.email + ">",
        subject: 'Markerville - Verify Your Account',
        html: '<b style="font-weight: normal; color: red;">' +
                "You recently <strong>created</strong> an account to edit Markerville.<br><br>" +
                "Please click on this " + 
                "<a href='http://www.markerville.com/account-creation/verify-account?" + 
                encodedURIOptions +
                "'>link</a>" +
                " to verify your account.<br><br><br>" +
                "Thank you for signing up with Markerville!<br>" +
                "~ <strong>The Markerville Team</strong>" +
              '</b>'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent to ' + accountInfo.email + ': ' + info.response);

    });
}

module.exports.sendVerificationEmail = sendVerificationEmail;