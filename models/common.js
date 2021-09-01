const mongoose = require('mongoose');

const StorageSchema = new mongoose.Schema({
    addedAt: {type: Date, default: Date.now }
});
  
const StorageModel = mongoose.model('Storage', StorageSchema);
  

class Common {
    constructor() {}

    static getPath() {
        return '.';
    }

    static currentModel() {
        return StorageModel;
    };

    static insert(entityToAdd) {
        let _currentModel = this.currentModel();
        return new _currentModel(entityToAdd).save()
            .then(x => x._id);
    }

    static update(entityToUpdate) {
        let _currentModel = this.currentModel();
        console.log(`${_currentModel.modelName} UPDATED`);
        return _currentModel.findOneAndUpdate(
            { _id: entityToUpdate._id}, entityToUpdate, {upsert : true});
    }

    static delete(id) {
        if(!this.checkString(id) && typeof id !== "object") 
            return Promise.reject(new Error("Invalid argument"));
        let _currentModel = this.currentModel();
        return _currentModel.findByIdAndRemove(id);
    }

    static getAll() {
        return this.currentModel().find();
    }

    static getById(id) {
        if (!this.checkString(id) && typeof id !== 'object') {
            return Promise.reject(new Error(`Incorrect id: ${id} in common.js line 48`));
        }
        else {
            return this.currentModel().findOne({ _id : id});
        }
    }

    static entityExists(id){
        let _currentModel = this.currentModel();
        return _currentModel.find({_id: id})
            .then(x => {
                if(x.length !== 0) return Promise.resolve();
                else 
                    return Promise.reject(new Error(`${_currentModel.baseModelName}: entity does not exists`));
            });
    }
        
    //some functions to validate inputed data    

    static checkNumber(numberToCheck) {
        return typeof numberToCheck === 'number' && !isNaN(numberToCheck);
    }

    static checkString(str) {
        return typeof str === 'string'
        && str.length !== 0;
    }
    
};

module.exports = {Common};

