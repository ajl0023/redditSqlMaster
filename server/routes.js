const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const multer = require("multer");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
module.exports = (app, db) => {
  app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
  app.get("/api/posts", (req, res) => {
    var sql = `
    SELECT 
    content,
    image,
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            posts.author = users._id) AS author,
    createdAt,
    _id,
    title,
    ${
      req.user
        ? `(SELECT IFNULL((SELECT
            score
        FROM
            votes
        WHERE
            votes.postid = posts._id
                AND votes.authorid = '${req.user._id}'),0)) as voteState`
        : "0 as voteState"
    },
    (SELECT 
            IFNULL(SUM(votes.score),0)
        FROM
            votes
        WHERE
            votes.postid = posts._id) AS voteTotal
FROM
    mydb.posts`;

    db.query(sql, function (err, result) {
      if (err) throw err;
      const parsed = result.map((result) => {
        result.author = JSON.parse(result.author);
        return result;
      });
      res.json(parsed);
    });
  });
  app.post("/api/logout", (req, res, next) => {
    res.clearCookie("refresh");
    res.status(200).json("logged out");
  });
  app.get("/api/posts/:id", (req, res) => {
    const postid = req.params.id;
    var sql = `
    SELECT 
    content,
    image,
  
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            posts.author = users._id) AS author,
    DATE_FORMAT(createdAt, '%Y-%m-%dT%TZ') as createdAt,
    _id,
    title,
     ${
       req.user
         ? `(SELECT IFNULL((SELECT
            score
        FROM
            votes
        WHERE
            votes.postid = posts._id
                AND votes.authorid = '${req.user._id}'),0)) as voteState`
         : "0 as voteState"
     },
     (SELECT 
            IFNULL(SUM(votes.score),0)
        FROM
            votes
        WHERE
            votes.postid = posts._id) AS voteTotal
FROM
    mydb.posts WHERE _id = '${postid}'`;

    db.query(sql, function (err, post) {
      if (post && post.length > 0) {
        post[0].author = JSON.parse(post[0].author);
        res.json(post && post[0]);
      }
    });
  });
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS,
    secretAccessKey: process.env.AWS_SECRET,

    bucketname: process.env.BUCKET_NAME,
    // (...)
  });
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });
  app.post("/api/posts", upload.single("file"), async (req, res) => {
    let locationUrl;
    AWS.config.setPromisesDependency();
    if (req.file) {
      const s3 = new AWS.S3();
      const params = {
        ACL: "public-read",
        Bucket: process.env.BUCKET_NAME,
        Body: req.file.buffer,
        Key: `post/${req.file.originalname}`,
      };
      const upload = s3.upload(params).promise();
      locationUrl = await upload;
    }
    if (!req.user) {
      res.json("user not authenticated");
    }
    const postTabledata = `${
      locationUrl ? `'${locationUrl.Location}'` : null
    },"${req.body.title}","${req.user._id}",uuid(),NOW(),"${
      req.body.content
    }", log10(1)* 86400 / .301029995663981 + UNIX_TIMESTAMP(posts.createdAt)`;
    const sql = `INSERT INTO posts (image,title,author,_id,createdAt,content,hotscore) VALUES (${postTabledata});
      SET @_id = uuid();
      SET @last = last_insert_id();
      SET @inserted = (SELECT posts._id FROM posts WHERE main_id = @last);
      
      INSERT INTO votes (_id,postid,authorid,score,uid) VALUES (@_id,@inserted,"${req.user._id}",1,CONCAT(@_id,"${req.user._id}"));
      SELECT * from posts where _id = @inserted
      `;

    db.query(sql, (err, result) => {
      res.json(result && result[5] && result[5][0]);
    });
  });
  app.post("/api/comments", (req, res) => {
    const userid = req.user._id;
    const newComment = req.body;
    const sql = `
    SET @parent_depth = ${
      req.body.parentid
        ? `ifnull((SELECT depth from comments where _id = '${req.body.parentid}' ),0)+1;`
        : `${0};`
    }
    SET @_id = uuid();
    INSERT INTO comments (master_comment,Author,CreatedAt,Content,_id,Postid,ParentId,depth)
    VALUES (${
      req.body.master_comment ? `'${req.body.master_comment}'` : null
    },${`${userid}` ? `'${userid}'` : null},NOW(),"${
      newComment.content
    }",@_id,"${newComment.postid}",${
      req.body.parentid ? `'${req.body.parentid}'` : null
    },@parent_depth );
    SET @last = last_insert_id();
   
    SET @inserted = (SELECT comments._id FROM comments WHERE main_id = @last);
    INSERT INTO votes (_id,commentid,authorid,score,uid) VALUES (@_id,@inserted,"${
      req.user._id
    }",1,CONCAT(@_id,"${req.user._id}"));
    SELECT 
    depth,
    parentid,
    master_comment,
    content,
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            comments.author = users._id) AS author,
    createdAt,
    _id,
    comments.postid,
    (SELECT 
            score
        FROM
            votes
        WHERE
            comments._id = votes.commentid) AS voteState,
    (SELECT 
            SUM(votes.score)
        FROM
            votes
        WHERE
            votes.commentid = comments._id) AS voteTotal
FROM
    mydb.comments
      WHERE _id = @inserted
    `;

    db.query(sql, function (err, result) {
      if (err) throw err;
      if (result && result[6]) {
        result[6][0].author = JSON.parse(result[6][0].author);
        res.json(result[6][0]);
      } else {
        res.json(err);
      }
    });
  });
  app.get("/api/comments/:id", (req, res) => {
    const postid = req.params.id;
    const commentsQuery = `
    SELECT 
    depth, parentid,
    content,
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            comments.author = users._id) AS author,
    createdAt,master_comment,

    (IFNULL(master_comment, _id)) AS master_comment,
    _id,
    comments.postid,
    (SELECT 
            score
        FROM
            votes
        WHERE
            comments._id = votes.commentid) AS voteState,
    (SELECT 
            SUM(votes.score)
        FROM
            votes
        WHERE
            votes.commentid = comments._id) AS voteTotal
            ,
            dense_rank() OVER( order by depth) buckets
FROM
    mydb.comments
      WHERE Postid = "${postid}"
        ORDER BY master_comment
      `;

    db.query(commentsQuery, function (err, comments) {
      const parsed = comments.map((comment) => {
        comment.author = JSON.parse(comment.author);
        return comment;
      });
      res.json(parsed);
    });
  });

  app.put("/api/voteup/:id", (req, res) => {
    const id = req.params.id;

    const sql = `
    update votes
    SET score = 
      CASE
        WHEN votes.score = 1 THEN 0
        WHEN votes.score = -1 THEN 1
        WHEN votes.score = 0 THEN 1
      END
    where authorid = '${req.user._id}' AND ${req.body.type} = "${id}" ;
INSERT IGNORE INTO votes
    SET ${req.body.type} = "${id}", authorid = '${
      req.user._id
    }', score = 1, _id = uuid(),uid = '${id + req.user._id}';
    ${
      req.body.type === "postid"
        ? `update posts
    SET hotscore = log10((select sum(votes.score) from votes where votes.${req.body.type} = "${id}")+1)* 86400 / .301029995663981 + UNIX_TIMESTAMP(posts.createdAt)
     WHERE _id = "${id}";`
        : ";"
    }
    `;

    db.query(sql, function (err, resp) {
      res.json(resp);
    });
  });
  app.put("/api/votedown/:id", (req, res) => {
    const id = req.params.id;
    const sql = `
update votes
SET score = 
   CASE
    WHEN votes.score = 1 THEN -1
    WHEN votes.score = -1 THEN 0
    WHEN votes.score = 0 THEN -1
END
where authorid = '${req.user._id}' AND ${req.body.type} = "${id}" ;
INSERT IGNORE INTO votes
    SET ${req.body.type} = "${id}", authorid = '${
      req.user._id
    }', score = -1, _id = uuid(),uid = '${id + req.user._id}';
    ${
      req.body.type === "postid"
        ? `update posts
    SET hotscore = log10((select sum(votes.score) from votes where votes.${req.body.type} = "${id}")+1)* 86400 / .301029995663981 + UNIX_TIMESTAMP(posts.createdAt)
     WHERE _id = "${id}";`
        : ";"
    }


`;

    db.query(sql, function (err, resp) {
      res.json(resp);
    });
  });
  app.put("/api/posts/:id", (req, res) => {
    const postid = req.params.id;
    const userid = req.user._id;
    const sql = `
      update posts
SET content =
    CASE
      WHEN posts.author = '${userid}' THEN '${req.body.content}'
    ELSE posts.content

END
WHERE _id = '${postid}'
        
`;
    db.query(sql, function (err, resp) {
      res.json(resp);
    });
  });
  app.delete("/api/posts/:id", (req, res) => {
    const postid = req.params.id;
    const userid = req.user._id;
    const sql = `
    DELETE FROM posts 
WHERE
    _id = '${postid}'AND author = '${userid}' 
     
        
`;
    db.query(sql, function (err, resp) {
      res.json(resp);
    });
  });
  app.post("/api/signup", async (req, res) => {
    const saltRounds = 10;
    const { username, password } = req.body;

    const genSalt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, genSalt);

    const sql = `
      INSERT INTO users (_id,password,createdAt,username) VALUES (uuid(),"${hash}",NOW(),'${username}')
    `;

    db.query(sql, function (err, resp) {
      res.json(resp);
    });
  });
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const sql = `SELECT password,_id,username FROM users 
    
    WHERE username = '${username}'`;

    db.query(sql, function (err, resp) {
      const hash = resp[0].password;

      bcrypt.compare(password, hash, (err, result) => {
        if (result) {
          const token = jwt.sign(
            {
              _id: resp[0]._id,
              username: username,
            },
            process.env.ACCESS_TOKEN,
            { expiresIn: 1.2 * Math.pow(10, 6) }
          );
          const refreshToken = jwt.sign(
            { _id: resp[0]._id, username: username },
            process.env.REFRESH_TOKEN,
            {
              expiresIn: "60 days",
            }
          );

          res.cookie("refresh", refreshToken, {
            maxAge: 365 * 24 * 60 * 60 * 1000,
          });
          res.json({
            jwt_token: token,
            username: username,
            _id: resp[0]._id,
          });
        }
        if (result === false) {
          res.json("Incorrect password of username");
        }
      });
    });
  });
  app.get("/api/posts/sort/new", (req, res) => {
    var sql = `
    SELECT 
    content,
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            posts.author = users._id) AS author,
    createdAt,
    _id,
    title,
    EXISTS( SELECT 
            score
        FROM
            votes
         WHERE
            votes.postid = posts._id
                AND votes.authorid = ${
                  req.user ? `'${req.user._id}'` : null
                }) AS voteState,
    (SELECT 
            SUM(votes.score)
        FROM
            votes
        WHERE
            votes.postid = posts._id) AS voteTotal
FROM
    mydb.posts
    ORDER BY createdAt DESC
    `;

    db.query(sql, function (err, result) {
      if (err) throw err;
      const parsed = result.map((result) => {
        result.author = JSON.parse(result.author);
        return result;
      });
      res.json(parsed);
    });
  });
  app.get("/api/posts/sort/hot", (req, res) => {
    var sql = `
    SELECT 
    content,
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            posts.author = users._id) AS author,
    createdAt,
    _id,
    title,
    EXISTS( SELECT 
            score
        FROM
            votes
         WHERE
            votes.postid = posts._id
                AND votes.authorid = ${
                  req.user ? `'${req.user._id}'` : null
                }) AS voteState,
    (SELECT 
            SUM(votes.score)
        FROM
            votes
        WHERE
            votes.postid = posts._id) AS voteTotal
FROM
    mydb.posts
    ORDER BY hotScore DESC
    `;

    db.query(sql, function (err, result) {
      if (err) throw err;
      const parsed = result.map((result) => {
        result.author = JSON.parse(result.author);
        return result;
      });
      res.json(parsed);
    });
  });
  app.get("/api/posts/sort/top", (req, res) => {
    var sql = `
    SELECT 
    content,
    (SELECT 
            JSON_MERGE(JSON_OBJECT('username', username),
                        JSON_OBJECT('_id', _id)) AS comment
        FROM
            users
        WHERE
            posts.author = users._id) AS author,
    createdAt,
    _id,
    title,
    EXISTS( SELECT 
            score
        FROM
            votes
        WHERE
            votes.postid = posts._id
                AND votes.authorid = ${
                  req.user ? `'${req.user._id}'` : null
                }) AS voteState,
    (SELECT 
            SUM(votes.score)
        FROM
            votes
        WHERE
            votes.postid = posts._id) AS voteTotal
FROM
    mydb.posts
    ORDER BY voteTotal DESC
    `;

    db.query(sql, function (err, result) {
      if (err) throw err;
      const parsed = result.map((result) => {
        result.author = JSON.parse(result.author);
        return result;
      });
      res.json(parsed);
    });
  });
  app.get("/api/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader.split(" ");
    const token = bearerToken[1];
    if (!req.cookies.refresh) {
      res.status(403).json("refresh token expired");
    } else {
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, data) => {
        if (err) {
          const message =
            err.name === "JsonWebTokenError" ? "unauth" : err.message;
          res.status(403).json({
            error: message,
          });
        } else {
          res.json({ username: data.username, _id: data._id });
        }
      });
    }
  });
  app.get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
};
