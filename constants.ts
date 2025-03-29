export const HTTPMETHOD = {
    GET:"GET",
    POST:"POST",
    PUT:"PUT",
    DELETE:"DELETE"
}

export const BRANDS = {
    INCROWD: 1,
    OPINIONSITE: 2
}

export const ATTRIBUTE_ID = {
    CountryOfResidence:29
}

export const TransportTypeId = {
    email:1,
    phone:2
}

export const HTTP_STATUS_CODE = {
    'COMPLETED': 200,
    'CREATED':201,
    'INTERNAL_SERVER_ERROR': 500,
    'BAD_REQUEST': 400,
    'NOT_FOUND':404,
    'UNAUTHORIZED':401
}

export const COUNTRIES_NAMES = {
    "United States":"United States of America"
}

export const USER_VALIDATION_PROVIDER = {
    "Idology":3,
    "Medpro":2,
    "Yoti":4
}

export const VALIDATION_STATUS = {
    SKIPPED_YOTI: "Skipped Yoti",
    FAILED_VALIDATION: "Fail validation"
}

export const YOTI_FLOW = {
    MANUAL_VERIFICATION : "manual",
    VERIFICATION_LATER: "later",
    NEED_REVIEW: "review"
}

export const YOTI_CRON_JOBS = {
    DISABLE_USER : "DISABLE_USER",
    INCOMPLETE_REGISTRATION: "INCOMPLETE_REGISTRATION"
}

export const allowedOrigins = [
  "https://incrowdanswers.com",
  "https://www.incrowdanswers.com",
  "https://opinionsiteanswers.com",
  "https://www.opinionsiteanswers.com",
  "https://web-qa.incrowdanswers.com",
  "https://web-qa.opinionsiteanswers.com",
  "https://core-qa.incrowdanswers.com",
  "https://core-qa.opinionsiteanswers.com",
  "https://data-qa.incrowdanswers.com",
  "https://data-qa.opinionsiteanswers.com",
  "https://qual-qa.incrowdanswers.com",
  "https://qual-qa.opinionsiteanswers.com",
  "https://shg-panel-dev-staging.incrowdanswers.com",
  "https://localhost:3001",
];

export const allowedCountries = [
  "canada",
  "france",
  "germany",
  "italy",
  "spain",
  "united kingdom",
];