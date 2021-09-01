const {Common} = require('./common.js');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StorySchema = new Schema({
    name: {type: String, required: true},
    comment: {type: String, required: true},
    imgUrl: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    userRef: {type: Schema.Types.ObjectId, ref: 'User'}
});

const StoryModel = mongoose.model('Story', StorySchema);

class Story extends Common {
    constructor(name, comment, imgUrl, createdAt, userRef = null) {
        super();
        ///this.uploadedListRef = uploadedListRef;
        this.name = name;
        this.comment = comment;
        this.imgUrl = imgUrl;
        this.createdAt = createdAt;
        this.userRef = userRef;
    }

    static currentModel() {
        return StoryModel;
    };

    static update(id, entityToUpdate) {
        let _currentModel = this.currentModel();
        _currentModel.findOneAndUpdate({ "_id": id}, entityToUpdate, {new: true})
        .then(user => user._id);
    }
};
module.exports = {Story};