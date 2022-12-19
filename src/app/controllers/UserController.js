import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator/check/index.js";
import UserOTP from "../models/UserOTP.js";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import sendgridTransport from "nodemailer-sendgrid-transport";
import { request } from "express";
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

const userController = {
  login: (req, res) => {
    res.render("auth/login", {
      layout: false,
    });
  },

  handlLogin: async (req, res) => {
    try {
      if (!req.body.username || !req.body.password) {
        return res.render("auth/login", {
          layout: false,
          err_mess: "Username or Password is empty !!!",
        });
      }
      
      const a = await User.findOne({ username: req.body.username });
      console.log(a)
      if (!a || a.password !== req.body.password)
        return res.render("auth/login", {
          layout: false,
          err_mess: "Invalid Username or Password !!!",
        });
        // req.session.auth = true;
        req.session.role = a.role;
        req.session._id= a.id;
        console.log(req.session.auth)
      return res.render("home");
    } catch (err) {
      console.log(err);
      return res.redirect("login");
    }
  },
  register: (req, res) => {
    let message = req.flash("error");
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render("auth/register", {
      layout: false,
      errorMessage: message,
    });
  },
  getverifyOTP: (req, res) => {
    let message = req.flash("error");
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render("auth/verifyOTP", {
      layout: false,
      errorMessage: message,
    });
  },
  compareOTP: (req, res) => {
    const OTP = req.body.verifyOTP;
    const username = req.session.userOTP;
    console.log(222222222222);
    console.log("Now username is: ", username);
    UserOTP.findOne({ username: username }).then((result) => {
      //console.log(result)
      if (result === null) {
        req.flash("error", "OTP number is not exist !");
        //console.log("OTP number is not exist !")
        return res.redirect("verifyOTP");
      } else {
        if (OTP == result.otp) {
          User.updateOne(
            { username: username },
            { $set: { verified: true } }
          ).then((data) => {
            console.log(data);
            return res.redirect("login");
          });
        } else {
          req.flash("error", "OTP number is invalid !");
          return res.redirect("verifyOTP");
        }
      }
    });
  },
  solveRegister: async (req, res) => {
    let hashPass;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("auth/register", {
        layout: false,
        errorMessage: errors.array()[0].msg,
      });
    }
    User.findOne({ username: req.body.username }).then((result) => {
      //console.log("Find by username: ", result);
      if (result !== null) {
        req.flash(
          "error",
          "Username exists already, please pick a different one."
        );
        return res.redirect("register");
      } else {
        //console.log(222222);
        User.findOne({ email: req.body.email }).then((data) => {
          //console.log(33333);
          if (data !== null) {
            req.flash(
              "error",
              "E-Mail exists already, please pick a different one."
            );
            return res.redirect("register");
          } else {
            //console.log(4444);
            if (req.body.password !== req.body.passwordConfirmation) {
              req.flash(
                "error",
                "Password and confirmation of password is not matched. Please check again!."
              );
              return res.redirect("register");
            } else {
              const salt = bcrypt.genSaltSync(10);
              hashPass = bcrypt.hashSync(req.body.password, salt);
            }
            const otp = Math.floor(1000 + Math.random() * 9000);
            const info_mail = {
              from: "dangminh7122002@gmail.com",
              to: req.body.email,
              subject: "Verify Your Email",
              html: `<h2>Your OTP number is:</h2>
              <br><h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
              <h3>Please back to verify tab and enter this OTP number into verify input !</h3>`,
            };
            console.log(5435353, info_mail);
            transporter.sendMail(info_mail).then((mess) => {
              if (!mess) {
                console.log("Failed");
                console.log("go here");
              } else {
                console.log("Email sent...", mess);
                const user = new User({
                  username: req.body.username,
                  fullname: req.body.fullname,
                  email: req.body.email,
                  password: hashPass,
                  role: req.body.jobtitle,
                  verified: false,
                });
                const otp_info = new UserOTP({
                  username: req.body.username,
                  otp: otp,
                });
                const session_username = req.body.username;
                console.log(session_username);
                req.session.userOTP = session_username;

                user.save();
                UserOTP.deleteMany({ username: session_username }).then(() => {
                  otp_info.save();
                })
                
                return res.redirect("verifyOTP");
              }
            });
          }
        });
      }
    });
  },
};

export default userController;
