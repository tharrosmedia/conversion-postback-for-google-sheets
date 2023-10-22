// The constants needed to make this script run correctly. Update these when needed.

const SHEET_NAMES = {
    CREDENTIALS: 'Credentials',
    TRIGGER_SHEET: 'Data',
    LOG: 'Script Messages'
};

const HEADERS = {
    FIRST_NAME: "First Name",
    LAST_NAME: "Last Name",
    PHONE_NUMBER: "Phone Number",
    ZIPCODE: "Zip Code",
    EMAIL: "Email",
    LEAD_SOURCE: "Lead Source",
    LEAD_ID: "Event ID",
    DATE_OF_CLOSE: "Timestamp",
    PROJECT_VALUE: "Commission",
    CURRENCY: "USD", // Change to header row name where the currency is defined if using multiple currencies.
};

// These have to match what you put in your LEAD_SOURCE column
const LEAD_SOURCES = {
    TRIGGER_VALUE: 'yes',
    GOOGLE: 'Google', // What calls the handleGoogleEvent function
    FACEBOOK: 'Facebook' // What calls the handleFacebookEvent function
};

const API_INFO = {
    FACEBOOK: {
        REQUIRED_CREDENTIALS: ["Facebook_API_Version", "Facebook_Pixel_ID", "Facebook_API_Access_Token", "Conversion_Label"]
    },
    GOOGLE: {
        REQUIRED_CREDENTIALS: ["Google_Tracking_ID", "Conversion_Label"]
    }
};
