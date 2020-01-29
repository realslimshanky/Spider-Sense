const scrapy_cloud_api_url = 'https://app.scrapinghub.com/api/jobs/list.json?'
const refresh_timeout = 2000
var jobs_status = {}
var notification_log = {}
var notification_reminder_time = 5
var save_jobs_status = false

// Updating Job Status for all the Job IDs available in local storage
function updateJobsStatus() {
    checkAPIKey = browser.storage.local.get('apikey').then(object => object.apikey)
    checkJobIDs = browser.storage.local.get('job_ids').then(object => object.job_ids ? object.job_ids : [])
    checkJobsStatus = browser.storage.local.get('jobs_status').then(object => object.jobs_status)

    Promise.all([checkAPIKey, checkJobIDs, checkJobsStatus])
    .then(result => {
        apikey = result[0]
        job_ids = result[1]
        stored_jobs_status = result[2]
        if (!jobs_status && stored_jobs_status) {
            jobs_status = stored_jobs_status
        }
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
                            if (jobs_status[json.jobs[0].id]) {
                                Object.assign(jobs_status[json.jobs[0].id], JSON.parse(JSON.stringify(json.jobs[0])))
                            }
                            else {
                                jobs_status[json.jobs[0].id] = json.jobs[0]
                            }
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

// Cleaning and Saving Job Status to local storage
function cleanAndSaveJobsStatus() {
    if (!save_jobs_status) { return }
    browser.storage.local.set({'jobs_status': jobs_status})
}
setInterval(cleanAndSaveJobsStatus, refresh_timeout)

// Handling Messages coming from Popup
browser.runtime.onMessage.addListener(handleMessage)
function handleMessage(message) {
    if (message.run_function == 'updateJobsStatus') {
        updateJobsStatus()
    }
    if (message.run_function == 'updateComment') {
        Object.assign(jobs_status[message.job_id], {'comment': message.comment})
        cleanAndSaveJobsStatus()
    }
}

function updateNotifications() {
    // Sending Desktop notifications
    for (let [key, value] of Object.entries(jobs_status)) {
        if (!notification_log[key] && value.state == 'finished') {
            browser.notifications.create({
                "type": "basic",
                "iconUrl": browser.extension.getURL("icons/icon.png"),
                "title": "Spider Sense",
                "message": value.spider + " " + value.id + " has finished execution."
            }).then(response=> {
                notification_log[key] = new Date()
            })
        }
        if (notification_log[key] && value.state == 'finished') {
            now = new Date()
            time_difference = (now.getTime() - notification_log[key].getTime()) / (1000 * 60 * 60)
            if (time_difference > notification_reminder_time) {
                browser.notifications.create({
                    "type": "basic",
                    "iconUrl": browser.extension.getURL("icons/icon.png"),
                    "title": "Spider Sense",
                    "message": value.spider + " " + value.id + " has finished execution."
                }).then(response=> {
                    notification_log[key] = new Date()
                })
            }
        }
    }
}
setInterval(updateNotifications, refresh_timeout)

// Cleaning job ids which has been removed from the Popup
function cleanUpObjects() {
    browser.storage.local.get('job_ids')
    .then(response => {
        for (let [key, value] of Object.entries(jobs_status)) {
            if (!response.job_ids.includes(key)) {
                delete jobs_status[key]
            }
        }

        for (let [key, value] of Object.entries(notification_log)) {
            if (!response.job_ids.includes(key)) {
                delete notification_log[key]
            }
        }
    })
}
setInterval(cleanUpObjects, refresh_timeout)
