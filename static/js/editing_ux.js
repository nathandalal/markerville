function appendName(li_element_id) {
    var listElement = document.createElement('li');

    var headerspan = document.createElement('span');
    headerspan.style.fontWeight = 'bold';
    headerspan.innerHTML = "<br>Another Name: &nbsp;&nbsp;";

    var newspan = document.createElement('span');
    newspan.innerHTML = "<input type='text' name='biomoleculeNames[]'>&nbsp;";

    var buttons_span = document.createElement('span');
    buttons_span.innerHTML = "<input class='small_button' type='button' " + 
                                "onclick='appendName" + '("name_inputs");' + "'value='+'>&nbsp;" +
                                "<input class='small_button' type='button' " + 
                                "onclick='removeName" + '(this);' + "'value='-'>";

    listElement.appendChild(headerspan);
    listElement.appendChild(newspan);
    listElement.appendChild(buttons_span);
    document.getElementById(li_element_id).appendChild(listElement);
}

function removeName(removeButtonNode) {
    var removingSpan = removeButtonNode.parentNode.parentNode;
    removingSpan.parentNode.removeChild(removingSpan);
}

function showSubmit() {
    document.getElementById('editing-submit-button').style.display = 'inline-block';
    document.getElementById('alternate-submit-button-text').style.display = 'none';
}

function hideSubmit() {
    document.getElementById('editing-submit-button').style.display = 'none';
    document.getElementById('alternate-submit-button-text').style.display = 'inline-block';
} 