const mongoose = require('mongoose');

const messageContentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['file', 'text'],
            required: true
        },
        text: {
            type: String,
            required: true
        }
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        messageContent: {
            type: messageContentSchema,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('message', messageSchema);
