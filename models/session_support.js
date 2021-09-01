const crypto = require('crypto');

const serverSalt = "Y_o-_-Lo__nEvaH_|@cK";

function sha512(password, salt) {
    const hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    const value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

function checkAuth(req, res, next) {
    if (!req.user) return res.status(401).render('401'); //user is not authorized
    next();
}

function checkAdmin(req, res, next) {
    if (req.user.role !== 1) return res.status(403).render('403'); //user do not have permission
    next();
}

function checkID(id) {
    return id.length < 24 || id.length > 24;
}

module.exports = {
    serverSalt : serverSalt,
    sha512 : sha512,
    checkAdmin : checkAdmin,
    checkAuth : checkAuth,
    checkID: checkID
};