function sendFacebookEvent(lead_id, date, hashedFirstName, hashedLastName, hashedEmail, hashedPhoneNumber, hashedZipCode) {
    logEvent("Script run started: sendFacebookEvent");

    try {
        if (!lead_id || lead_id.trim() === "" || lead_id.trim() === "-") {
        // Log an error message if lead_id is blank or "-"
        logEvent("Error in sendFacebookEvent: lead_id is blank or invalid.");
        return; // Exit the function if lead_id is blank or "-"
        }

        var credentials = getCredentials();

        API_INFO.FACEBOOK.REQUIRED_CREDENTIALS.forEach(credential => {
            if (!credentials[credential]) {
                let msg = `Error: ${credential} is missing. Please fill it out in the "${SHEET_NAMES.CREDENTIALS}" sheet.`;
                logEvent(msg);
                Logger.log(msg);
                return;
            }
        });

        var fbApiVersion = credentials["Facebook_API_Version"];
        var fbPixelId = credentials["Facebook_Pixel_ID"];
        var fbAccessToken = credentials["Facebook_API_Access_Token"];
        var conversion_label = credentials["Conversion_Label"];

        var spreadsheetName = SpreadsheetApp.getActiveSpreadsheet().getName();

        // Convert the time structured "YYYY-MM-DD HH:mm:ss" into a UNIX timestamp.
        function convertToTimestamp(dateStr) {
            var date;
            if (typeof dateStr === 'object' && dateStr instanceof Date) {
              date = dateStr;
              } else if (typeof dateStr === 'string') {
            var parts = dateStr.split(' ');
            var dateParts = parts[0].split('-');
            var timeParts = parts[1].split(':');
            date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], timeParts[2]);
              } else {
                throw new Error('Invalid date input format: ' + dateStr);
                }
            return Math.floor(date.getTime() / 1000); // Convert milliseconds to seconds
        }
        
        let timestamp = convertToTimestamp(date); 
        let fbApiUrl = `https://graph.facebook.com/v${fbApiVersion}/${fbPixelId}/events?access_token=${fbAccessToken}`; 
        let payload = {
            "data": [
                {
                    "event_name": conversion_label,
                    "event_time": timestamp,
                    "action_source": "system_generated",
                    "user_data": {
                        "lead_id": lead_id,
                        "em": [hashedEmail],
                        "fn": [hashedFirstName],
                        "ln": [hashedLastName],
                        "zp": [hashedZipCode],
                        "ph": [hashedPhoneNumber]
                    },
                    "custom_data": {
                        "lead_event_source": spreadsheetName,
                        "event_source": "crm"
                    }
                }
            ]
        };
        let params = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
        };
    
        let maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                let response = UrlFetchApp.fetch(fbApiUrl, params);
                
                if (response.getResponseCode() == 200) {
                    Logger.log('Event sent to Facebook successfully!');
                } else {
                    Logger.log('Failed to send event to Facebook: ' + response.getContentText());
                }
                break;
            } catch (e) {
                Logger.log('Attempt [' + (attempt + 1) + '] failed to send event to Facebook: ' + e);
                if (attempt < maxAttempts - 1) {
                    Utilities.sleep(1000);  
                } else {
                    Logger.log('Failed to send event to Facebook after ' + maxAttempts + ' attempts.');
                }
            }
        }
    } catch (error) {
        logEvent("Error in sendFacebookEvent: " + error.toString());
      }
}
