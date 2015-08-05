function appendName(spanName){
    var headerspan = document.createElement('span');
    headerspan.style.fontWeight = 'bold';
    headerspan.innerHTML = "<br>Another Name: &nbsp;&nbsp;";

    var newspan = document.createElement('span');
    newspan.innerHTML = "<input type='text' name='biomarkerNames[]'>&nbsp;";

    document.getElementById(spanName).appendChild(headerspan);
    document.getElementById(spanName).appendChild(newspan);
}