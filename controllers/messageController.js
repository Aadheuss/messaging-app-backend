const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const Message = require("../models/message");
const User = require("../models/user");
const Inbox = require("../models/inbox");
const InboxParticipant = require("../models/inboxParticipant");

exports.message_new_post = [
  body("message", "Message must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("receiver", "Receiver can't be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  asyncHandler(async (req, res, next) => {
    if (!req.isAuthenticated()) {
      const err = new Error("You are not logged in");
      err.status = 401;

      return next(err);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = new Error("Failed to send the message");
      err.status = 422;
      err.details = errors.errors.map((object) => {
        return { msg: object.msg, path: object.path };
      });

      return next(err);
    }

    const user = req.session.passport.user;
    const receiver = await User.findOne(
      { username: req.body.receiver },
      "_id"
    ).exec();

    if (receiver === null) {
      const err = new Error("Receiver does't exist");
      err.status = 404;

      return next(err);
    }

    const inbox = new Inbox();
    const inboxParticipant = new InboxParticipant({
      user,
      inbox: inbox._id,
    });

    const inboxParticipantTwo = new InboxParticipant({
      user: receiver._id,
      inbox: inbox._id,
    });

    const message = new Message({
      user: user,
      message: req.body.message,
      inbox: inbox._id,
    });

    inbox.last_message = message;

    await inbox.save();
    await inboxParticipant.save();
    await inboxParticipantTwo.save();
    await message.save();

    res.json({
      message: "message successfully sent",
      data: {
        message,
        inbox,
        inboxParticipants: {
          sender: inboxParticipant,
          receiver: inboxParticipantTwo,
        },
      },
    });
  }),
];

exports.message_post = [
  body("message", "Message must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  asyncHandler(async (req, res, next) => {
    if (!req.isAuthenticated()) {
      const err = new Error("You are not logged in");
      err.status = 401;

      return next(err);
    }

    if (!req.params.inboxid.match(/^[0-9a-fA-F]{24}$/)) {
      const err = new Error("the given inbox id is not valid");
      err.status = 404;
      return next(err);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const err = new Error("Failed to send the message");
      err.status = 422;
      err.details = errors.errors.map((object) => {
        return { msg: object.msg, path: object.path };
      });

      next(err);
    } else {
      const user = req.session.passport.user;

      const message = new Message({
        user: user,
        message: req.body.message,
        inbox: req.params.inboxid,
      });

      await message.save();
      const inbox = await Inbox.findOneAndUpdate(
        { _id: req.params.inboxid },
        { last_message: message },
        { new: true }
      )
        .populate({
          path: "last_message",
          populate: {
            path: "user",
            select: "username",
          },
        })
        .exec();

      res.json({
        message: "message successfully sent",
        data: {
          inbox,
        },
      });
    }
  }),
];
