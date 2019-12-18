const scrapy_cloud_api_url = 'https://app.scrapinghub.com/api/jobs/list.json?'
const refresh_timeout = 2000
var apikey = ''

// Verifying the API Key by making request to Scrapy Cloud API and save it to local storage
function verifyAndSaveAPIKey(apikey) {
    function replacePlaceholderAndDefaultElements(placeholder) {
        document.querySelector('.content-div').style.display = 'block'
        document.querySelector('.divider').style.display = 'block'
        document.querySelector('input.api-key-input').value = ''
        document.querySelector('input.api-key-input').placeholder = placeholder
        document.querySelector('.message').style.display = 'none'
    }

    api_url = scrapy_cloud_api_url + 'apikey=' + apikey
    fetch(api_url)
    .then(response => {
        if (response.status == 400 && response.statusText == 'Bad Request') {
            browser.storage.local.set({'apikey': apikey})
            .then(success => {
                document.querySelector('.dashboard-div').style.display = 'flex'
                document.querySelector('.message').style.display = 'none'
            })
        } else {
            replacePlaceholderAndDefaultElements('Please enter valid key')
        }
    })
    .catch(error => {
        replacePlaceholderAndDefaultElements(error)
    })
}

// Handling the API Key input from HTML
function onAPIKeySubmitHandler() {
    var apikey = document.querySelector('input.api-key-input').value
    var apikey_regex = /[\d\w]*/g
    apikey = apikey.match(apikey_regex)
    if (!apikey) {
        document.querySelector('input.api-key-input').placeholder = 'Please enter valid key'
    } else {
        apikey = apikey[0]
        document.querySelector('.content-div').style.display = 'none'
        document.querySelector('.divider').style.display = 'none'
        document.querySelector('.message').style.display = 'block'
        verifyAndSaveAPIKey(apikey)
    }
}
document.querySelector('#api-key-submit').addEventListener('click', onAPIKeySubmitHandler)

// Save Job ID to local storage
function saveJobID(job_id) {
    function displayMessageAndReplaceDefaultElements(message) {
        document.querySelector('.message h2').innerHTML = message
        setTimeout(() => {
            document.querySelector('.message').style.display = 'none'
            document.querySelector('.message h2').innerHTML = 'Loading!'
            document.querySelector('input.job-id-input').value = ''
            document.querySelector('.add-new-job').style.display = 'block'
        }, 3000)
    }
    browser.storage.local.get('job_ids')
    .then(object => {
        job_ids = object.job_ids ? object.job_ids : []
        if (job_ids.indexOf(job_id) == -1) {
            job_ids.push(job_id)
            browser.storage.local.set({'job_ids': job_ids})
            .then(success => {displayMessageAndReplaceDefaultElements('Job ID Saved!')})
        } else {
            displayMessageAndReplaceDefaultElements('Job ID exist!')
        }
    })
    .catch(error => {displayMessageAndReplaceDefaultElements(error)})
}

// Verifying the Job ID by making request to Scrapy Cloud API
function verifyJobID(job_id) {
    var project_id_regex = /(\d+)\/\d+\/\d+/i
    var project_id = job_id.match(project_id_regex)[1]

    api_url = scrapy_cloud_api_url + 'apikey=' + apikey + '&project=' + project_id + '&job=' + job_id
    fetch(api_url)
        .then(response => {
            response.json()
            .then(json => {
                if (response.status == 200 && json.count){
                    saveJobID(job_id)
                } else {
                    document.querySelector('input.job-id-input').value = ''
                    document.querySelector('input.job-id-input').placeholder = 'Please enter valid Job ID or URL'
                    document.querySelector('.message').style.display = 'none'
                    document.querySelector('.add-new-job').style.display = 'block'
                }
            })
        })
        .catch(error => {
            document.querySelector('input.job-id-input').value = ''
            document.querySelector('input.job-id-input').placeholder = error
            document.querySelector('.message').style.display = 'none'
            document.querySelector('.add-new-job').style.display = 'block'
        })
}

// Handling new Job ID trigger from HTML
function addNewJobIDHandler () {
    var job_id = document.querySelector('input.job-id-input').value
    var job_id_regex = /\d+\/\d+\/\d+/g
    job_id = job_id.match(job_id_regex)
    if (!job_id) {
        document.querySelector('input.job-id-input').value = ''
        document.querySelector('input.job-id-input').placeholder = 'Please enter valid Job ID or URL'
    } else {
        job_id = job_id[0]
        document.querySelector('.add-new-job').style.display = 'none'
        document.querySelector('.message').style.display = 'block'
        verifyJobID(job_id)
    }
}
document.querySelector('#job-id-submit').addEventListener('click', addNewJobIDHandler)

// Handling remove Job ID trigger from HTML and removing it from local storage
function removeJobID(object) {
    job_id = object.target.getAttribute('job_id')
    browser.storage.local.get('job_ids')
    .then(object => {
        job_ids = object.job_ids ? object.job_ids : []
        if (job_ids.indexOf(job_id) != -1) {
            job_ids.splice(job_ids.indexOf(job_id), 1)
            browser.storage.local.set({'job_ids': job_ids})
            .then(success => { updateJobsStatus() })
        }
    })
    .catch(error => { console.log(error) })
}

// Check saved API Key upon opening Popup
function checkAPIKey() {
    browser.storage.local.get('apikey')
    .then(object => {
        if (object.apikey) {
            document.querySelector('.content-div').style.display = 'none'
            document.querySelector('.divider').style.display = 'none'
            document.querySelector('.dashboard-div').style.display = 'flex'
            apikey = object.apikey
            updateJobsStatus()
        }
    })
}
checkAPIKey()

// Update Jobs Status on HTML table
function updateJobsStatus() {
    if (!apikey) { return }
    checkJobIDs = browser.storage.local.get('job_ids').then(object => object.job_ids ? object.job_ids : [])
    checkJobsStatus = browser.storage.local.get('jobs_status').then(object => object.jobs_status)

    Promise.all([checkJobIDs, checkJobsStatus])
    .then(result => {
        job_ids = result[0]
        jobs_status = result[1]
        if (!job_ids || !jobs_status) { return }

        monitoring_table = document.querySelector('.monitoring-table')
        monitoring_table.innerHTML = ''
        header_row = document.createElement('tr')
        column_values = ['Job ID', 'Spider', 'Items', 'Errors', 'Status', ' ']
        for (var i=0; i < column_values.length; i++) {
            var header_column = document.createElement('th')
            header_column.innerHTML = column_values[i]
            header_row.appendChild(header_column)
        }
       monitoring_table.appendChild(header_row)

       for (var i=0; i < job_ids.length; i++) {
            var job_status = jobs_status[job_ids[i]]
            if (!job_status) { continue }
            var row = document.createElement('tr')
            row.id = job_status.id.replace(/\//g, '')

            var column = document.createElement('td')
            var a_tag = document.createElement('a')
            a_tag.href = 'https://app.scrapinghub.com/p/' + job_status.id
            a_tag.innerHTML = job_status.id
            column.appendChild(a_tag)
            row.appendChild(column)

            column = document.createElement('td')
            column.innerHTML = job_status.spider
            row.appendChild(column)

            column = document.createElement('td')
            column.innerHTML = job_status.items_scraped
            row.appendChild(column)

            column = document.createElement('td')
            column.innerHTML = job_status.errors_count
            row.appendChild(column)

            column = document.createElement('td')
            column.innerHTML = job_status.close_reason ? job_status.close_reason : job_status.state
            row.appendChild(column)

            column = document.createElement('td')
            column.innerHTML = 'X'
            column.className =  'remove_job_id'
            column.setAttribute('job_id', job_status.id)
            column.addEventListener('click', removeJobID)
            row.appendChild(column)

            monitoring_table.appendChild(row)
       }
    })
}
setInterval(updateJobsStatus, refresh_timeout)
