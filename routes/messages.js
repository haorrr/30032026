var express = require('express');
var router = express.Router();
let { checkLogin } = require('../utils/authHandler.js')
let messageModel = require('../schemas/messages')
let mongoose = require('mongoose')
let multer = require('multer')
let path = require('path')

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname)
        let fileName = Date.now() + "-" + Math.round(Math.random() * 1000_000_000) + ext;
        cb(null, fileName)
    }
})
let upload = multer({ storage: storage, limits: 5 * 1024 * 1024 })

// GET / - lấy message cuối cùng của mỗi user mà user hiện tại đã chat
router.get('/', checkLogin, async function (req, res, next) {
    try {
        let currentUserId = new mongoose.Types.ObjectId(req.userId)
        let result = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUserId },
                        { to: currentUserId }
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $addFields: {
                    otherUser: {
                        $cond: {
                            if: { $eq: ['$from', currentUserId] },
                            then: '$to',
                            else: '$from'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$otherUser',
                    lastMessage: { $first: '$$ROOT' }
                }
            },
            { $replaceRoot: { newRoot: '$lastMessage' } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'from',
                    foreignField: '_id',
                    as: 'from'
                }
            },
            { $unwind: '$from' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'to',
                    foreignField: '_id',
                    as: 'to'
                }
            },
            { $unwind: '$to' }
        ])
        res.send(result)
    } catch (err) {
        res.status(400).send({ message: err.message })
    }
})

// GET /:userID - lấy toàn bộ message giữa user hiện tại và userID
router.get('/:userID', checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.userId
        let otherUserId = req.params.userID
        let result = await messageModel
            .find({
                $or: [
                    { from: currentUserId, to: otherUserId },
                    { from: otherUserId, to: currentUserId }
                ]
            })
            .populate('from', 'username avatarUrl')
            .populate('to', 'username avatarUrl')
        res.send(result)
    } catch (err) {
        res.status(400).send({ message: err.message })
    }
})

// POST / - gửi message (text hoặc file)
router.post('/', checkLogin, upload.single('file'), async function (req, res, next) {
    try {
        let messageContent;
        if (req.file) {
            messageContent = {
                type: 'file',
                text: req.file.path
            }
        } else {
            messageContent = {
                type: 'text',
                text: req.body.text
            }
        }
        let newMessage = new messageModel({
            from: req.userId,
            to: req.body.to,
            messageContent: messageContent
        })
        let result = await newMessage.save()
        result = await result.populate('from', 'username avatarUrl')
        result = await result.populate('to', 'username avatarUrl')
        res.send(result)
    } catch (err) {
        res.status(400).send({ message: err.message })
    }
})

module.exports = router;
