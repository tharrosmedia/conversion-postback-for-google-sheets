function sendGoogleEvent(lead_id, date, projectValue) {
    logEvent("Script run started: sendGoogleEvent");
    
    try {
        if (!lead_id || lead_id.trim() === "" || lead_id.trim() === "-") {
            logEvent("Error in sendGoogleEvent: lead_id is blank or invalid.");
            return;
        }

        var credentials = getCredentials();

        API_INFO.GOOGLE.REQUIRED_CREDENTIALS.forEach(credential => {
            if (!credentials[credential]) {
                let msg = `Error: ${credential} is missing. Please fill it out in the Credentials sheet.`;
                logEvent(msg);
                Logger.log(msg);
                return;
            }
        });

        // Obtains the timezone of the active Google Sheet and formats the input date according to the required format.
        function formatDateTimeWithSheetTimezone(date) {
            const sheetTimezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
            const d = new Date(date);
            return Utilities.formatDate(d, sheetTimezone, "yyyy-MM-dd HH:mm:ssXXX");
        }

        var google_id = credentials["Google_Tracking_ID"];
        var conversion_label = credentials["Conversion_Label"];
      
        let conversionDateTime = formatDateTimeWithSheetTimezone(date); 
        let googleApiUrl = `https://www.googleadservices.com/pagead/conversion/${google_id}/`;

        let payload = {
            "google_conversion_id": google_id,
            "google_conversion_label": conversion_label,
            "google_conversion_value": projectValue,
            "google_conversion_currency": HEADERS.CURRENCY,
            "gclid": lead_id, 
            "conversion_action_resource_name": conversion_label,
            "conversion_date_time": conversionDateTime
        };

        let params = {
            method: 'post',
            payload: payload,
        };
        
        // Error handling with retry logic
        let maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                let response = UrlFetchApp.fetch(googleApiUrl, params);
                Logger.log('Event sent to Google successfully!');
                logEvent("Event sent to Google successfully!");
                break;
            } catch (e) {
                let errorMsg = 'Attempt [' + (attempt + 1) + '] failed to send event to Google: ' + e.toString();
                Logger.log(errorMsg);
                logEvent(errorMsg);
                
                if (attempt < maxAttempts - 1) {
                    Utilities.sleep(1000);
                } else {
                    let finalErrorMsg = 'Failed to send event to Google after ' + maxAttempts + ' attempts.';
                    Logger.log(finalErrorMsg);
                    logEvent(finalErrorMsg);
                }
            }
        }
    } catch (e) {
        let finalCatchError = 'Error sending event to Google: ' + e.toString();
        logEvent(finalCatchError);
        Logger.log(finalCatchError);
    }
}
