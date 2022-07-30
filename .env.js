const production = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "production",
};

const development = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: "9000",
  Meta_WA_accessToken:
    "EAARKdU5eZBtcBAASpO4xbcompIIDWQiFZCmMrz03mYKs4oefFC2rtpS98GW8ZAuZAkRnkGRw2ZAlOkHI07ghh4oVHGqiVhf9ZAaza1cuzsf1jUpV1ZBUsBw5UiGZCXAnOFN9JUptKIafyx8tJpPdLbAxKMppczp2qV26geQMWxx3MPcVynMMtSCqYVZBaGvI61zZCdsypKjE6kQgZDZD",
  Meta_WA_SenderPhoneNumberId: "107975678671137",
  Meta_WA_wabaId: "100518529431556",
  Meta_WA_VerifyToken: "whatDoYouThink",
};

const fallback = {
  ...process.env,
  NODE_ENV: undefined,
};

module.exports = (environment) => {
  console.log(`Execution environment selected is: "${environment}"`);
  if (environment === "production") {
    return production;
  } else if (environment === "development") {
    return development;
  } else {
    return fallback;
  }
};
