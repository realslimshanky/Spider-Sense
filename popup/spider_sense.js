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
        if (response.status == 400 &&
                (response.statusText == 'Bad Request' || response.statusText == ''))
        {
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
    apikey = document.querySelector('input.api-key-input').value
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
            .then(success => {
                displayMessageAndReplaceDefaultElements('Job ID Saved!')
                browser.runtime.sendMessage({'run_function': 'updateJobsStatus'})
                updateJobsStatus()
             })
        } else {
            displayMessageAndReplaceDefaultElements('Job ID already exist!')
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
function addNewJobIDHandler() {
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

// Display Job detail
function displayJobDetail(object) {
    function backToDashboard(object) {
        document.querySelector('.job-detail-div').style.display = 'none'
        document.querySelector('.dashboard-div').style.display = 'flex'
        object.target.removeAttribute('selected_job_for_display')
    }

    function createAndGetDetailRow(first_column_value, second_column_value) {
        row = document.createElement('tr')
        column = document.createElement('td')
        column.innerHTML = first_column_value
        row.appendChild(column)
        column = document.createElement('td')
        column.innerHTML = second_column_value
        row.appendChild(column)
        return row
    }

    function onTextareaChange(job_id) {
        comment_textarea = document.getElementById('comment_textarea')
        browser.runtime.sendMessage(
            {
                'run_function': 'updateComment',
                'job_id': job_id,
                'comment': comment_textarea.value
            }
        )
    }

    object.target.setAttribute('selected_job_for_display', '')
    job_id = object.target.getAttribute('job_id')

    browser.storage.local.get('jobs_status')
    .then(response_object => {
        job_status = response_object.jobs_status
        job_status = job_status[job_id]
        if (job_status) {
            job_detail_table = document.querySelector('.job-detail-table')
            job_detail_table.innerHTML = ''
            header_row = document.createElement('tr')

            header_column = document.createElement('th')
            header_column.innerHTML = '<'
            header_column.className = 'back_to_dashboard'
            header_column.addEventListener('click', function() { backToDashboard(object) })
            header_row.appendChild(header_column)
            header_column = document.createElement('th')
            header_column.innerHTML = job_status.spider + ' ' + job_status.id
            header_row.appendChild(header_column)

            job_detail_table.appendChild(header_row)

            // Row: Spider Name
            job_detail_table.appendChild(createAndGetDetailRow('Spider Name', job_status.spider))

            // Row: Spider ID
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'ID'
            row.appendChild(column)
            column = document.createElement('td')
            a_tag = document.createElement('a')
            a_tag.href = 'https://app.scrapinghub.com/p/' + job_status.id
            a_tag.innerHTML = job_status.id
            column.appendChild(a_tag)
            row.appendChild(column)
            job_detail_table.appendChild(row)

            // Row: Items Scraped
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'Items Scraped'
            row.appendChild(column)
            column = document.createElement('td')
            a_tag = document.createElement('a')
            a_tag.href = 'https://app.scrapinghub.com/p/' + job_status.id + '/items'
            a_tag.innerHTML = job_status.items_scraped
            column.appendChild(a_tag)
            row.appendChild(column)
            job_detail_table.appendChild(row)

            // Row: Logs
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'Logs'
            row.appendChild(column)
            column = document.createElement('td')
            a_tag = document.createElement('a')
            a_tag.href = 'https://app.scrapinghub.com/p/' + job_status.id + '/log'
            a_tag.innerHTML = job_status.logs
            column.appendChild(a_tag)
            row.appendChild(column)
            job_detail_table.appendChild(row)

            // Row: Errors
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'Errors'
            row.appendChild(column)
            column = document.createElement('td')
            if (job_status.errors_count) {
                a_tag = document.createElement('a')
                a_tag.href = 'https://app.scrapinghub.com/p/' + job_status.id + '/log?filterAndHigher&filterType=error'
                a_tag.innerHTML = job_status.errors_count
                column.appendChild(a_tag)
            }
            else {
                column.innerHTML = 'No error'
            }
            row.appendChild(column)
            job_detail_table.appendChild(row)

            // Row: State
            job_detail_table.appendChild(createAndGetDetailRow('State', job_status.state))

            // Row: Close Reason
            if (job_status.close_reason) {
                job_detail_table.appendChild(createAndGetDetailRow('Close Reason', job_status.close_reason))
            }

            // Row: Spider Arguments
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'Arguments'
            row.appendChild(column)
            column = document.createElement('td')
            ul = document.createElement('ul')
            ul.style.listStyleType = 'none'
            ul.style.paddingLeft = 0
            if (job_status.spider_args) {
                for (key in job_status.spider_args) {
                    li = document.createElement('li')
                    li.innerHTML = key + '=' + job_status.spider_args[key]
                    ul.appendChild(li)
                }
            }
            column.appendChild(ul)
            row.appendChild(column)
            job_detail_table.appendChild(row)

            // Row: Spider Tags
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'Tags'
            row.appendChild(column)
            column = document.createElement('td')
            ul = document.createElement('ul')
            ul.style.listStyleType = 'none'
            ul.style.paddingLeft = 0
            if (job_status.tags.length) {
                for (i=0; i<job_status.tags.length; i++) {
                    li = document.createElement('li')
                    li.innerHTML = job_status.tags[i]
                    ul.appendChild(li)
                }
            }
            column.appendChild(ul)
            row.appendChild(column)
            job_detail_table.appendChild(row)

            // Row: Version
            job_detail_table.appendChild(createAndGetDetailRow('Version', job_status.version))

            // Row: Start Time
            job_detail_table.appendChild(createAndGetDetailRow('Start Time', job_status.started_time))

            // Row: Last Updated Time
            job_detail_table.appendChild(createAndGetDetailRow('Updated Time', job_status.updated_time))

            // Row: Priority
            job_detail_table.appendChild(createAndGetDetailRow('Priority', job_status.priority))

            // Row: Comments
            row = document.createElement('tr')
            column = document.createElement('td')
            column.innerHTML = 'Comments'
            row.appendChild(column)
            column = document.createElement('td')
            textarea = document.createElement('textarea')
            textarea.setAttribute('id', 'comment_textarea')
            textarea.placeholder = 'Text will be autosaved as soon as you change it.'
            if (job_status.comment) {
                textarea.value = job_status.comment
            }
            textarea.addEventListener('keyup', function() {onTextareaChange(job_id)});
            column.appendChild(textarea)
            row.appendChild(column)
            job_detail_table.appendChild(row)

            document.querySelector('.dashboard-div').style.display = 'none'
            document.querySelector('.job-detail-div').style.display = 'block'
        }
    })
    .catch(error => { console.log(error) })
}

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
        column_values = ['Job ID', 'Spider', 'Items', 'Errors', 'Status', ' ', ' ']
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

            column = document.createElement('td')
            column.innerHTML = '>'
            column.className =  'display_job_detail'
            column.setAttribute('job_id', job_status.id)
            column.addEventListener('click', displayJobDetail)
            row.appendChild(column)

            monitoring_table.appendChild(row)
       }
    })
}
setInterval(updateJobsStatus, refresh_timeout)
