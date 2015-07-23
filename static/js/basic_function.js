function doSearch(formElement) {
    var searchText = formElement.getElementsByTagName("input")[0].value;
    alert("you typed " + searchText);
}

function doLogin(formElement) {
    var emailText = formElement.getElementsByTagName("input")[0].value;
    var pwdText = formElement.getElementsByTagName("input")[1].value;
    alert("email: " + emailText + "\npwd: " + pwdText);
}