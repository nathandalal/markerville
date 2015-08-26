function appendName(li_element_id) {
    var listElement = document.createElement('li');

    var headerspan = document.createElement('span');
    headerspan.style.fontWeight = 'bold';
    headerspan.innerHTML = "<br>Another Name: &nbsp;&nbsp;";

    var newspan = document.createElement('span');
    newspan.innerHTML = "<input type='text' name='biomoleculeNames[]' required>&nbsp;";

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

function appendTrial(ul_element_id, discoveryList) {
    var listElement = document.createElement('li');

    var header_disc_span = document.createElement('span');
    header_disc_span.style.fontWeight = 'bold';
    header_disc_span.innerHTML = "<br>Method of Discovery: &nbsp;&nbsp;";

    var disc_span = document.createElement('span');
    var text = '<input list="discovery_input_datalist" name="sources[][disease]" required><br>'
    disc_span.innerHTML = text;

    var header_num_span = document.createElement('span');
    header_num_span.style.fontWeight = 'bold';
    header_num_span.innerHTML = "# Patients: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + 
                            "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";

    var num_span = document.createElement('span');
    num_span.innerHTML = '<input type="number" name="sources[][trials][][numPatients]">';

    var buttons_span = document.createElement('span');

    buttons_span.innerHTML = "<input class='small_button' type='button' " + 
                                "onclick='appendTrial" + '("trials_editing_section", ' + 
                                JSON.stringify(discoveryList) +
                                ');' + "' value='+'>&nbsp;" +
                                "<input class='small_button' type='button' " + 
                                "onclick='removeTrial" + '(this);' + "'value='-'>";

    listElement.appendChild(header_disc_span);
    listElement.appendChild(disc_span);
    listElement.appendChild(header_num_span);
    listElement.appendChild(num_span);
    listElement.appendChild(buttons_span);
    document.getElementById(ul_element_id).appendChild(listElement);
}

function removeTrial(removeButtonNode) {
    removeName(removeButtonNode);
}

function appendSource(li_element_id) {
    alert('Adding multiple sources to one biomarker is not supported yet. Sorry!');
}