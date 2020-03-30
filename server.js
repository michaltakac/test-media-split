const express = require("express");
const bodyParser = require("body-parser");
const boolParser = require("express-query-boolean");
const fs = require("fs");
const multer = require("multer");
//const aws = require("aws-sdk");
//const multerS3 = require('multer-s3')
const MediaSplit = require("media-split");

const app = express();
//TODO: setup S3
//const s3 = new aws.S3({ /* ... */ })

app.use(bodyParser.urlencoded({ extended: true }));
app.use(boolParser());

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

// TODO: use multer S3 uploader (https://www.npmjs.com/package/multer-s3)
// var demos = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: 'some-bucket',
//     metadata: function (req, file, cb) {
//       cb(null, {fieldName: file.fieldname});
//     },
//     key: function (req, file, cb) {
//       cb(null, `demo-${Date.now()}-${file.originalname}`)
//     }
//   })
// })

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (req.query.subscribed) {
      console.log("User is subscribed. Uploading full track...");
      cb(null, "fulltracks");
    } else {
      console.log("User is not subscribed. Uploading demo...");
      cb(null, "demos");
    }
  },
  filename: function(req, file, cb) {
    if (req.query.subscribed) {
      cb(null, `fulltrack-${Date.now().toString()}-${file.originalname}`);
    } else {
      cb(null, `demo-${Date.now().toString()}-${file.originalname}`);
    }
  }
});

const upload = multer({ storage });

app.post("/uploadtrack", upload.single("track"), (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }

  // TODO: here will be code for retrieving the file from S3
  // for now, we'll only use files we have on our filesystem...
  if (file.filename.includes("demo")) {
    let split = new MediaSplit({
      input: file.path, // this will be then absolute path to audio file in S3
      sections: [`[00:00 - 00:40] demo-${Date.now()}`],
      audioonly: true,
      format: "mp3",
      quality: "lowestaudio",
      output: "demos"
    });
    split
      .parse()
      .then(sections => {
        const demo = sections[0];

        // remove old demo audio file
        fs.unlinkSync(file.path);

        // do something with the demo... process it, then send it to the user?
        res.send(demo);
      })
      .catch(err => {
        const error = new Error(
          "There was a problem with parsing of the demo audio track: ",
          err
        );
        error.httpStatusCode = 400;
        return next(error);
      });
  } else {
    res.send(file);
  }
});

app.listen(3000, () => console.log("Server started on port 3000"));
