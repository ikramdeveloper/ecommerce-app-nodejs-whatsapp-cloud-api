process.env = require("./.env.js")(process.env.NODE_ENV || "development");
const PORT = process.env.PORT || 9000;
const express = require("express");

const indexRoutes = require("./routes/index");

const main = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use("/", indexRoutes);
  app.use("*", (req, res) => res.status(404).send("404 Not found"));

  app.listen(PORT, console.log(`listening on port ${PORT}`));
};

main();
