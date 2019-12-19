const scrapy_cloud_api_url = 'https://app.scrapinghub.com/api/jobs/list.json?'
const refresh_timeout = 2000
var jobs_status = {}
var save_jobs_status = false

// Updating Job Status for all the Job IDs available in local storage
function updateJobsStatus() {
    checkAPIKey = browser.storage.local.get('apikey').then(object => object.apikey)
    checkJobIDs = browser.storage.local.get('job_ids').then(object => object.job_ids ? object.job_ids : [])

    Promise.all([checkAPIKey, checkJobIDs])
    .then(result => {
        apikey = result[0]
        job_ids = result[1]
        if (apikey && job_ids.length) {
            for (i = 0; i < job_ids.length; i++) {
                var job_id = job_ids[i]
                var project_id_regex = /(\d+)\/\d+\/\d+/i;
                var project_id = job_id.match(project_id_regex)[1]
                var api_url = scrapy_cloud_api_url + 'apikey=' + apikey + '&project=' + project_id + '&job=' + job_id
                fetch(api_url)
                .then(response => {
                    response.json()
                    .then(json => {
                        if (response.status == 200 && json.jobs.length) {
                            jobs_status[json.jobs[0].id] = json.jobs[0]
                            save_jobs_status = true
                        }
                    })
                })
                .catch(error => {console.log(error)})
            }
        }
    })
}
setInterval(updateJobsStatus, refresh_timeout)

// Saving Job Status to local storage
function saveJobsStatus() {
    if (!save_jobs_status) { return }
    browser.storage.local.set({'jobs_status': jobs_status})
}
setInterval(saveJobsStatus, refresh_timeout)

browser.runtime.onMessage.addListener(handle_message)
function handle_message(message) {
    if (message.run_function == 'updateJobsStatus') {
        updateJobsStatus()
    }
}
