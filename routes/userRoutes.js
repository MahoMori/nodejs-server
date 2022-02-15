const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
  COOKIE_OPTIONS,
  getToken,
  getRefreshToken,
  verifyUser,
} = require("../auth/authenticate");

router.post("/signup", (req, res, next) => {
  if (!req.body.firstName) {
    res.status(500).send({
      name: "FirstNameError",
      message: "First name required",
    });
  } else {
    User.register(new User({ username: req.body.username }));
    req.body.password,
      (err, user) => {
        if (err) {
          res.status(500).send(err);
        } else {
          user.firstName = req.body.firstName;
          user.lastName = req.body.lastName;
          const token = getToken({ _id: user._id });
          const refreshToken = getRefreshToken({ _id: user._id });
          user.refreshToken.push({ refreshToken });
          user.save((err, user) => {
            if (err) {
              res.status(500).send(err);
            } else {
              res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
              res.send({ success: true, token });
            }
          });
        }
      };
  }
});

router.post("/login", passport.authenticate("local"), (req, res, next) => {
  const token = getToken({ _id: req.user._id });
  const refreshToken = getRefreshToken({ _id: req.user._id });

  User.findById(req.user._id)
    .then((user) => {
      user.refreshToken / push({ refreshToken });
      user.save((err, user) => {
        if (err) {
          res.status(500).send(err);
        } else {
          res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
          res.send({ success: true, token });
        }
      });
    })
    .catch((err) => next(err));
});

router.post("/refreshToken", (req, res, next) => {
  const { signedCookies = {} } = req;
  const { refreshToken } = signedCookies;

  if (refreshToken) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      const userId = payload._id;

      User.findOne({ _id: userId })
        .then((user) => {
          if (user) {
            const tokenIndex = user.refreshToken.findindex(
              (item) => item.refreshToken === refreshToken
            );

            if (tokenIndex === -1) {
              res.status(401).send("Unauthorized");
            } else {
              const token = getToken({ _id: userId });
              const newRefreshToken = getRefreshToken({ _id: userId });
              user.refreshToken[tokenIndex] = { refreshToken: newRefreshToken };
              user.save((err, user) => {
                if (err) {
                  res.status(500).send(err);
                } else {
                  res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);
                  res.send({ success: true, token });
                }
              });
            }
          } else {
            res.status(401).send("Unauthorized");
          }
        })
        .catch((err) => {
          next(err);
        });
    } catch (err) {
      res.status(401).send("Unauthorized");
    }
  } else {
    res.status(401).send("Unauthorized");
  }
});

router.get("/me", verifyUser, (req, res, next) => {
  res.send(req.user);
});

router.post("/logout", verifyUser, (req, res, next) => {
  const { signedCookies = {} } = req;
  const { refreshToken } = signedCookies;

  User.findById(req.user._id)
    .then((user) => {
      const tokenIndex = user.refreshToken.findindex(
        (item) => item.refreshToken === refreshToken
      );

      if (tokenIndex !== -1) {
        user.refreshToken.id(user.refreshoken[tokenIndex]._id).remove();
      }
      user.save((err, user) => {
        if (err) {
          res.status(500).send(err);
        } else {
          res.clearCookie("refreshToken", COOKIE_OPTIONS);
          res.send({ success: true });
        }
      });
    })
    .catch((err) => next(err));
});

module.exports = router;