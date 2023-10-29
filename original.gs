function onEdit(e) {
    handleDirectAPIEvent(e);
}

const SHEET_NAMES = {
    CREDENTIALS: 'Credentials',
    TRIGGER_SHEET: 'Closed',
    LOG: 'App Script Messages'
};

const HEADERS = {
    FIRST_NAME: "First Name",
    LAST_NAME: "Last Name",
    PHONE_NUMBER: "Phone Number",
    ZIPCODE: "Zip Code",
    EMAIL: "Email",
    LEAD_SOURCE: "Lead Source",
    LEAD_ID: "Lead ID",
    DATE_OF_CLOSE: "Date of Close",
    PROJECT_VALUE: "Project Value",
    CURRENCY: "USD", // Change to header row name where the currency is defined if using multiple currencies.
};

const API_INFO = {
    FACEBOOK: {
        TRIGGER_VALUE: 'facebook',
        REQUIRED_CREDENTIALS: ["Facebook_API_Version", "Facebook_Pixel_ID", "Facebook_API_Access_Token", "Conversion_Label"]
    },
    GOOGLE: {
        TRIGGER_VALUE: 'google',
        REQUIRED_CREDENTIALS: ["Google_Tracking_ID", "Conversion_Label"]
    }
};

// Searches the column names for the information needed.
function getColumnIndex(headerRow, columnName) {
    return headerRow.indexOf(columnName);
}

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

// Converts a value into a SHA 256 hashed value.
function hashValue(value) {
  var rawValue = value.toString(); 
  var hashedValue = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawValue, Utilities.Charset.UTF_8);
  return hashedValue.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// Pulls credentials from specified sheet.
function getCredentials() {
  var values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CREDENTIALS).getDataRange().getValues();
  var credentials = {};
  
  values.forEach(function(row) {
    credentials[row[0]] = row[1];
  });
  
  return credentials;
}

// Obtains the timezone of the active Google Sheet and formats the input date according to the required format.
function formatDateTimeWithSheetTimezone(date) {
    const sheetTimezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const d = new Date(date);
    return Utilities.formatDate(d, sheetTimezone, "yyyy-MM-dd HH:mm:ssXXX");
}

// Logs events in specified sheet.
function logEvent(logMessage) {
    // Logging in both Google Apps Script log and in the sheet
    Logger.log(logMessage);
    
    // Accessing or creating the "Script Errors" sheet
    let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOG);
    if (!logSheet) {
        logSheet = spreadsheet.insertSheet(SHEET_NAMES.LOG);
        logSheet.appendRow(["Timestamp", "Message"]);
    }
    
    // Adding the log message to the "Script Errors" sheet
    logSheet.appendRow([new Date(), logMessage]);
}
function handleDirectAPIEvent(e) {
    logEvent("Script run started: handleDirectAPIEvent");
    try {
        let editedCell = e.range;
        let sourceSheet = editedCell.getSheet();
        
        if (sourceSheet.getName() !== SHEET_NAMES.TRIGGER_SHEET) {
            return;
        }
        
        let headerRow = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

        // Get column indices for headers.
        let firstNameIdx = getColumnIndex(headerRow, HEADERS.FIRST_NAME);
        let lastNameIdx = getColumnIndex(headerRow, HEADERS.LAST_NAME);
        let phoneNumberIdx = getColumnIndex(headerRow, HEADERS.PHONE_NUMBER);
        let zipCodeIdx = getColumnIndex(headerRow, HEADERS.ZIPCODE);
        let emailIdx = getColumnIndex(headerRow, HEADERS.EMAIL);
        let leadSourceIdx = getColumnIndex(headerRow, HEADERS.LEAD_SOURCE);
        let lead_idIdx = getColumnIndex(headerRow, HEADERS.LEAD_ID);
        let dateIdx = getColumnIndex(headerRow, HEADERS.DATE_OF_CLOSE);
        let projectValueIdx = getColumnIndex(headerRow, HEADERS.PROJECT_VALUE);
        
        // Check if any index is -1, which means the column name wasn't found
        if ([firstNameIdx, lastNameIdx, phoneNumberIdx, zipCodeIdx, emailIdx, leadSourceIdx, lead_idIdx, dateIdx, projectValueIdx].includes(-1)) {
        let variables = ["First Name", "Last Name", "Phone Number", "Zipcode", "Email", "Lead Source", "Lead ID", "Date", "Project Value"];
        let missingVars = [];

       [firstNameIdx, lastNameIdx, phoneNumberIdx, zipCodeIdx, emailIdx, leadSourceIdx, lead_idIdx, dateIdx, projectValueIdx].forEach((index, i) => {
        if(index === -1) {
          missingVars.push(variables[i]);
        }
      });

      logEvent(`Error: Missing required columns: ${missingVars.join(', ')}.`);
      }

        // Check if edited cell is in the "Lead Source" column and has a valid trigger value
        if (editedCell.getColumn() === leadSourceIdx + 1 && 
           [API_INFO.FACEBOOK.TRIGGER_VALUE, API_INFO.GOOGLE.TRIGGER_VALUE].includes(editedCell.getValue().toString().toLowerCase().trim())) {
           
            let cellValue = editedCell.getValue().toString().toLowerCase().trim();
            let dataRangeValues = sourceSheet.getRange(editedCell.getRow(), 1, 1, sourceSheet.getLastColumn()).getValues()[0];
           
            let firstName = dataRangeValues[firstNameIdx];
            let lastName = dataRangeValues[lastNameIdx];
            let phoneNumber = dataRangeValues[phoneNumberIdx];
            let zipCode = dataRangeValues[zipCodeIdx];
            let email = dataRangeValues[emailIdx];
            let lead_id = dataRangeValues[lead_idIdx];
            let date = dataRangeValues[dateIdx];
            let projectValue = dataRangeValues[projectValueIdx];
            let [hashedFirstName, hashedLastName, hashedEmail, hashedPhoneNumber, hashedZipCode] = [firstName, lastName, email, phoneNumber, zipCode].map(val => hashValue(val));
            
            let eventHandlers = {
              [API_INFO.FACEBOOK.TRIGGER_VALUE]: () => {
              logEvent("Facebook event triggered.");
              sendFacebookEvent(lead_id, date, hashedFirstName, hashedLastName, hashedEmail, hashedPhoneNumber, hashedZipCode);
              },
              [API_INFO.GOOGLE.TRIGGER_VALUE]: () => {
              logEvent("Google event triggered.");
              sendGoogleEvent(lead_id, date, projectValue);
              }
            };
            
            eventHandlers[cellValue]();
            
            logEvent("Script run successfully completed: handleDirectAPIEvent");
        }
    } catch (error) {
        logEvent("Error in handleDirectAPIEvent: " + error.toString());
    }
}

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
